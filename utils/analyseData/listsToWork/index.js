const { PROD_USERS_TABLE_NAME } = require('../../config');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));

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

  const result = await ddb.scan(params);

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
