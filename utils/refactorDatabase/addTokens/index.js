const { getAllUnconfirmedUsers } = require('../../shared/users/getUsers');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const { PROD_USERS_TABLE_NAME } = require('../../config');

const Bottleneck = require('bottleneck');
const uuid = require('uuid/v4');

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 2 });

const addTokens = async () => {
  const users = await getAllUnconfirmedUsers(PROD_USERS_TABLE_NAME);
  let count = 0;

  for (const user of users) {
    await limiter.schedule(async () => {
      await addToken(user);
    });
    console.log('refactored', user.cognitoId, count++, users.length);
  }
};

const addToken = async user => {
  const params = {
    TableName: PROD_USERS_TABLE_NAME,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'SET customToken =  :customToken',
    ExpressionAttributeValues: {
      ':customToken': { token: uuid(), timestamp: new Date().toISOString() },
    },
    ReturnValues: 'UPDATED_NEW',
  };

  await ddb.update(params).promise();
};

addTokens();
