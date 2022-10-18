const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.VOUCHERS_TABLE_NAME;

const { errorResponse } = require('../../../shared/apiResponse');
const { getUserBySafeAddress } = require('../../../shared/users');
const { checkBasicAuth } = require('../../../shared/utils');
const { getVouchers } = require('../../../shared/vouchers');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const LIMIT = 35;

module.exports.handler = async event => {
  try {
    if (!checkBasicAuth(event)) {
      return errorResponse(401, 'No basic auth provided');
    }

    const requestBody = JSON.parse(event.body);

    if (!validateParams(requestBody)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    const { providerId, amount, safeAddress, transactionId } = requestBody;

    if (await checkIfTransactionIdIsUsed(transactionId)) {
      return errorResponse(
        400,
        'Transaction id was already used',
        'transactionIdUsed'
      );
    }

    if (await checkIfLimitIsReached(safeAddress, amount)) {
      return errorResponse(403, 'Limit is reached');
    }

    const voucher = await getFirstVoucherOfProvider(providerId, amount);

    if (voucher === null) {
      return errorResponse(
        404,
        'No voucher with this provider and amount found'
      );
    }

    const timestamp = new Date().toISOString();

    await purchaseVoucher(voucher.id, safeAddress, transactionId, timestamp);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          id: voucher.id,
          providerId: voucher.provider.id,
          amount,
          code: voucher.code,
          sold: {
            safeAddress,
            timestamp,
            transactionId,
          },
        },
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error purchasing voucher', error);
    return errorResponse(500, 'Error purchasing voucher', error);
  }
};

const getFirstVoucherOfProvider = async (
  providerId,
  amount,
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression:
      '#provider.#id = :providerId AND amount = :amount AND attribute_not_exists(soldTo)',
    ExpressionAttributeValues: {
      ':providerId': providerId,
      ':amount': amount,
    },
    ExpressionAttributeNames: {
      '#provider': 'provider',
      '#id': 'id',
    },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  if (result.Count !== 0) {
    return result.Items[0];
  }

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getFirstVoucherOfProvider(
      providerId,
      amount,
      result.LastEvaluatedKey
    );
  }

  return null;
};

const checkIfTransactionIdIsUsed = async transactionId => {
  const result = await getVoucherByTransactionId(transactionId);

  return result.Count !== 0;
};

const getVoucherByTransactionId = transactionId => {
  const params = {
    TableName: tableName,
    KeyConditionExpression: 'transactionId = :transactionId',
    IndexName: 'transactionIdIndex',
    ExpressionAttributeValues: {
      ':transactionId': transactionId,
    },
  };

  return ddb.query(params).promise();
};

const checkIfLimitIsReached = async (safeAddress, amount) => {
  const vouchers = await getVouchers(safeAddress);
  const individualLimit = await getIndividiualLimit(safeAddress);

  let sum = 0;

  for (const voucher of vouchers) {
    sum += voucher.amount;
  }

  const limit = individualLimit || LIMIT;

  return sum + amount > limit;
};

const purchaseVoucher = (voucherId, safeAddress, transactionId, timestamp) => {
  const params = {
    TableName: tableName,
    Key: { id: voucherId },
    UpdateExpression:
      'SET soldTo = :safeAddress, soldAt = :timestamp, transactionId = :transactionId',
    ExpressionAttributeValues: {
      ':safeAddress': safeAddress,
      ':timestamp': timestamp,
      ':transactionId': transactionId,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

const getIndividiualLimit = async safeAddress => {
  const result = await getUserBySafeAddress(safeAddress);

  if (result.Count === 0) {
    return null;
  }

  return result.Items[0].circlesLimit || null;
};

const validateParams = ({ safeAddress, providerId, amount, transactionId }) => {
  if (
    typeof safeAddress !== 'string' ||
    safeAddress === '' ||
    typeof providerId !== 'string' ||
    providerId === '' ||
    typeof amount !== 'number' ||
    typeof transactionId !== 'string'
  ) {
    return false;
  }

  return true;
};
