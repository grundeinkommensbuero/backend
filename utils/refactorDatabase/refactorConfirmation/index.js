const {
  getAllVerifiedCognitoUsers,
  getUser,
  getAllUnverifiedCognitoUsers,
} = require('../../shared/users/getUsers');

const { confirmUser } = require('../../shared/users/createUsers');
const CONFIG = require('../../config');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 2 });

const ddb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));

const refactorConfirmation = async (userPoolId, tableName) => {
  try {
    const confirmedUsers = await getAllVerifiedCognitoUsers(userPoolId);
    let count = 0;

    for (const user of confirmedUsers) {
      await limiter.schedule(async () => {
        const userId = user.Username;
        const result = await getUser(tableName, userId);

        if ('Item' in result && !('confirmed' in result.Item)) {
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

        await confirmUser(userPoolId, userId);
        console.log('Confirmed user in cognito', userId);
      });
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

  return ddb.update(params);
};

refactorConfirmation(CONFIG.PROD_USER_POOL_ID, CONFIG.PROD_USERS_TABLE_NAME);
