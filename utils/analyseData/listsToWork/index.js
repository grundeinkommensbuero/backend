const { PROD_USERS_TABLE_NAME } = require('../../config');

const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const run = async () => {
  const users = await getUsersForListsToWork();

  console.log(users.length);
};

// Bring your lists to work is a campaign started during the second phase of berlin campaign
const getUsersForListsToWork = async (users = [], startKey = null) => {
  const params = {
    TableName: PROD_USERS_TABLE_NAME,
    FilterExpression: 'attribute_exists(#store.#listsToWork)',
    ExpressionAttributeNames: {
      '#store': 'store',
      '#listsToWork': 'listsToWork',
    },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersForListsToWork(users, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return users;
};

run();
