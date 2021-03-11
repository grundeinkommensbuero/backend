const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');
const { getAllUnconfirmedUsers } = require('../../shared/users');

const ddb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();

const tableName = process.env.USERS_TABLE_NAME;
const userPoolId = process.env.USER_POOL_ID;

const limiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });

module.exports.handler = async event => {
  try {
    await deleteUsers();

    return event;
  } catch (error) {
    console.log('error while deleting unconfirmed users', error);
    return event;
  }
};

const deleteUsers = async () => {
  // get all users, which are not verified from user pool
  const unconfirmedUsers = await getAllUnconfirmedUsers();

  console.log('unconfirmed users length', unconfirmedUsers.length);
  // filter users to check if the creation of the user was more than
  // x days ago
  const date = new Date();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const filteredUsers = unconfirmedUsers.filter(
    user => date - new Date(user.createdAt) > thirtyDays
  );

  console.log(
    'not verified and it has been x days count:',
    filteredUsers.length
  );

  for (const user of filteredUsers) {
    try {
      await limiter.schedule(async () => {
        await deleteUserInDynamo(user);
        await deleteUserInCognito(user);

        console.log('deleted user', user.cognitoId);
      });
    } catch (error) {
      console.log('error deleting user', error);
    }
  }
};

const deleteUserInCognito = user => {
  console.log('deleting user in cognito', user.cognitoId);
  const params = {
    UserPoolId: userPoolId,
    Username: user.cognitoId,
  };

  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = user => {
  console.log('deleting user in dynamo', user.cognitoId);
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: user.cognitoId,
    },
  };

  return ddb.delete(params).promise();
};
