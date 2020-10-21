const {
  ADMIN_POOL_ID,
  ADMIN_CLIENT_ID,
  USER_POOL_ID,
  CLIENT_ID,
  USER_ID,
  PASSWORD,
  ADMIN_USER_ID,
} = require('../testConfig');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);

module.exports.authenticate = async () => {
  return makeAuthenticationCall(USER_POOL_ID, CLIENT_ID, USER_ID);
};

module.exports.authenticateAdmin = async () => {
  return makeAuthenticationCall(ADMIN_POOL_ID, ADMIN_CLIENT_ID, ADMIN_USER_ID);
};

const makeAuthenticationCall = async (poolId, clientId, userId) => {
  const { AuthenticationResult } = await cognito
    .adminInitiateAuth({
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      UserPoolId: poolId,
      ClientId: clientId,
      AuthParameters: {
        USERNAME: userId,
        PASSWORD,
      },
    })
    .promise();

  return AuthenticationResult.IdToken;
};
