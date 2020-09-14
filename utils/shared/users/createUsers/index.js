const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const { getRandomString } = require('../../utils');

// Create a new cognito user in our user pool
module.exports.createUserInCognito = (userPoolId, email, source) => {
  const params = {
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
      {
        Name: 'email',
        Value: email,
      },
    ],
    MessageAction: 'SUPPRESS', // we don't want to send an "invitation mail"
  };

  if (source) {
    params.UserAttributes.push({ Name: 'custom:source', Value: source });
  }

  return cognito.adminCreateUser(params).promise();
};

// confirm user by setting a random password
// (need to do it this way, because user is in state force_reset_password)
module.exports.confirmUser = (userPoolId, userId) => {
  const password = getRandomString(20);
  const setPasswordParams = {
    UserPoolId: userPoolId,
    Username: userId,
    Password: password,
    Permanent: true,
  };

  // set fake password to confirm user
  return cognito.adminSetUserPassword(setPasswordParams).promise();
};

module.exports.createUserInDynamo = (tableName, userId, user) => {
  delete user.cognitoId;

  const params = {
    TableName: tableName,
    Item: {
      cognitoId: userId,
      ...user,
    },
  };

  return ddb.put(params).promise();
};
