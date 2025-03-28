const { getAllUsers } = require('../../shared/users/getUsers');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const { PROD_USERS_TABLE_NAME } = require('../../config');

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 2 });

const removeListFlow = async () => {
  const users = await getAllUsers(
    PROD_USERS_TABLE_NAME,
    'attribute_exists(listFlow)'
  );
  let count = 0;
  console.log(users);
  for (const user of users) {
    await limiter.schedule(async () => {
      await updateUser(user);
    });
    console.log('refactored', user.cognitoId, count++);
  }
};

const updateUser = async user => {
  const params = {
    TableName: PROD_USERS_TABLE_NAME,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'REMOVE listFlow, ctaFlow',
    ReturnValues: 'UPDATED_NEW',
  };

  await ddb.update(params).promise();
};

removeListFlow();
