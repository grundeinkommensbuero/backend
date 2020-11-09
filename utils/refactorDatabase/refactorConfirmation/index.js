const {
  getAllVerifiedCognitoUsers,
  getUser,
  getAllUnverifiedCognitoUsers,
} = require('../../shared/users/getUsers');
const CONFIG = require('../../config');
const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 2 });

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const refactorConfirmation = async (userPoolId, tableName) => {
  try {
    const confirmedUsers = await getAllVerifiedCognitoUsers(userPoolId);
    let count = 0;

    for (const user of confirmedUsers) {
      await limiter.schedule(async () => {
        const userId = user.Username;
        const result = await getUser(tableName, userId);

        if ('Item' in result) {
          await updateUser(tableName, userId, {
            value: true,
            timestamp: result.Item.createdAt,
          });
        }
      });

      count++;
      process.stdout.write(`processed ${count} users\r`);
    }

    const unconfirmedUsers = await getAllUnverifiedCognitoUsers(userPoolId);

    for (const user of unconfirmedUsers) {
      await limiter.schedule(async () => {
        const userId = user.Username;

        await updateUser(tableName, userId, {
          value: false,
        });
      });

      console.log('updated', user.cognitoId);
    }
  } catch (error) {
    console.log('Error', error);
  }
};

const updateUser = (tableName, userId, confirmed) => {
  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET confirmed = :confirmed',
    ExpressionAttributeValues: { ':confirmed': confirmed },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

refactorConfirmation(CONFIG.PROD_USER_POOL_ID, CONFIG.PROD_USERS_TABLE_NAME);
