const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.VOUCHERS_TABLE_NAME;

const { errorResponse } = require('../../../shared/apiResponse');
const { checkBasicAuth } = require('../../../shared/utils');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    if (!checkBasicAuth(event)) {
      return errorResponse(401, 'No basic auth provided');
    }

    const { queryStringParameters } = event;

    let filterSafeAddress;
    let filterTimestamp;

    if (queryStringParameters) {
      const { safeAddress, timestamp } = queryStringParameters;

      filterSafeAddress = safeAddress;
      filterTimestamp = timestamp;
    }

    const vouchers = await getVouchers(filterSafeAddress, filterTimestamp);

    const formattedVouchers = vouchers.map(
      ({ provider, code, amount, soldTo, soldAt, transactionId }) => ({
        providerId: provider.id,
        amount,
        code,
        sold: soldTo
          ? {
              safeAddress: soldTo,
              timestamp: soldAt,
              transactionId,
            }
          : null,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: formattedVouchers,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error getting vouchers', error);
    return errorResponse(500, 'Error getting vouchers', error);
  }
};

const getVouchers = async (
  safeAddress,
  timestamp,
  vouchers = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression: `${!safeAddress ? 'attribute_exists(soldTo) AND ' : ''}${
      timestamp ? 'soldAt >= :timestamp' : ''
    }`,
  };

  if (timestamp) {
    params.ExpressionAttributeValues = {};
    params.ExpressionAttributeValues[':timestamp'] = timestamp;
  }

  // If safe address is passed we want to do a query on the gsi
  if (safeAddress) {
    params.KeyConditionExpression = 'soldTo = :safeAddress';
    params.IndexName = 'safeAddressIndex';
    params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};
    params.ExpressionAttributeValues[':safeAddress'] = safeAddress;
  }

  // Remove trailing AND if exists
  if (params.FilterExpression.slice(-5) === ' AND ') {
    params.FilterExpression = params.FilterExpression.slice(0, -5);
  }

  if (params.FilterExpression === '') {
    params.FilterExpression = null;
  }

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  // If safe address is passed we want to do a query on the gsi
  const result = safeAddress
    ? await ddb.query(params).promise()
    : await ddb.scan(params).promise();

  // add elements to existing array
  vouchers.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getVouchers(
      safeAddress,
      timestamp,
      vouchers,
      result.LastEvaluatedKey
    );
  }

  return vouchers;
};
