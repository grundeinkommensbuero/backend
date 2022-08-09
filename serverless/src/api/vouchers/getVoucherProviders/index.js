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

    const vouchers = await getAllAvailableVouchers();

    if (vouchers.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          data: [],
        }),
        headers: responseHeaders,
        isBase64Encoded: false,
      };
    }

    const providers = {};

    for (const voucher of vouchers) {
      if (!(voucher.provider.id in providers)) {
        providers[voucher.provider.id] = {
          ...voucher.provider,
          availableOffers: [],
        };
      }

      const index = providers[voucher.provider.id].availableOffers.findIndex(
        ({ amount }) => amount === voucher.amount
      );

      if (index === -1) {
        providers[voucher.provider.id].availableOffers.push({
          amount: voucher.amount,
          countAvailable: 1,
        });
      } else {
        providers[voucher.provider.id].availableOffers[index].countAvailable++;
      }
    }

    const providersArray = [];

    Object.keys(providers).forEach(providerId => {
      providersArray.push({
        ...providers[providerId],
      });
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: providersArray,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error getting voucher providers', error);
    return errorResponse(500, 'Error getting voucher providers', error);
  }
};

const getAllAvailableVouchers = async (vouchers = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_not_exists(soldTo)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  vouchers.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getAllAvailableVouchers(vouchers, result.LastEvaluatedKey);
  }

  return vouchers;
};
