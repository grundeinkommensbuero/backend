const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

// Function to get all signature lists
const getSignatureLists = async (
  tableName,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getSignatureLists(
      tableName,
      signatureLists,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return signatureLists;
};

// function to get signature lists for this particular user
const getSignatureListsOfUser = async (
  tableName,
  userId,
  campaignCode = null
) => {
  const params = {
    TableName: tableName,
    IndexName: 'userIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  // If a campaign code is provided add a filter expression
  if (campaignCode) {
    params.FilterExpression = 'campaign.code = :campaignCode';
    params.ExpressionAttributeValues[':campaignCode'] = campaignCode;
  }

  return ddb.query(params).promise();
};

const getSignatureCountOfUser = async (
  tableName,
  userId,
  campaignCode = null
) => {
  const { Items: lists } = await getSignatureListsOfUser(
    tableName,
    userId,
    campaignCode
  );

  let count = 0;

  for (const list of lists) {
    if ('received' in list) {
      for (const scan of list.received) {
        count += scan.count;
      }
    }
  }

  return count;
};

const getScannedByUserSignatureLists = async (
  tableName,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(scannedByUser)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getScannedByUserSignatureLists(
      tableName,
      signatureLists,
      result.LastEvaluatedKey
    );
  }

  // otherwise return the array
  return signatureLists;
};

module.exports = {
  getSignatureLists,
  getSignatureListsOfUser,
  getSignatureCountOfUser,
  getScannedByUserSignatureLists,
};
