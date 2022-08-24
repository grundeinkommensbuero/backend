const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const getSafeAddresses = async () => {
  const states = {
    AskUserName: 0,
    Dashboard: 0,
    InfoSecurity: 0,
    Login: 0,
    Trusts: 0,
  };

  for (const user of await getAllUsers()) {
    states[user.store.circlesResumee.lastState.tag]++;
    console.log(user.store.circlesResumee);
  }

  console.log(states);
};

const getAllUsers = async (
  tableName,
  condition = null,
  conditionValue = null,
  users = [],
  startKey = null
) => {
  const params = {
    TableName: 'prod-users',
    FilterExpression: 'attribute_exists(#store.#circles)',
    ExpressionAttributeNames: {
      '#store': 'store',
      '#circles': 'circlesResumee',
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
    return await getAllUsers(
      tableName,
      condition,
      conditionValue,
      users,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return users;
};

const searchCirclesName = async circlesName => {
  for (const user of await getAllUsers()) {
    if (user.store.circlesResumee.name === circlesName) {
      console.log(user);
    }
  }
};

getSafeAddresses();
