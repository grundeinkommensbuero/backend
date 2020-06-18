const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');
const { getAllUnverifiedCognitoUsers } = require('../../shared/users');

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
  const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();

  // filter users to check if the creation of the user was more than
  // x days ago
  const date = new Date();
  const tenDays = 10 * 24 * 60 * 60 * 1000;
  const filteredUsers = unverifiedCognitoUsers.filter(
    user => date - user.UserCreateDate > tenDays
  );

  console.log(
    'not verified and it has been x days count:',
    filteredUsers.length
  );

  for (const user of filteredUsers) {
    try {
      await limiter.schedule(async () => {
        await deleteUserInCognito(user);
        await deleteUserInDynamo(user);
      });
    } catch (error) {
      console.log('error deleting user', error);
      break;
    }
  }
};

const deleteUserInCognito = user => {
  console.log('deleting user in cognito', user.Username);
  const params = {
    UserPoolId: userPoolId,
    Username: user.Username, // Username is the id of cognito
  };

  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = user => {
  console.log('deleting user in dynamo', user.Username);
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: user.Username, // Username is the id of cognito
    },
  };

  return ddb.delete(params).promise();
};
