const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.VOUCHERS_TABLE_NAME;

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

module.exports = { getVouchers };
