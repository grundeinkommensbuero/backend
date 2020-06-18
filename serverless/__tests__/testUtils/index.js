const {
  ADMIN_POOL_ID,
  ADMIN_CLIENT_ID,
  USER_POOL_ID,
  CLIENT_ID,
  REFRESH_TOKEN,
  ADMIN_REFRESH_TOKEN,
} = require('../testConfig');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);

module.exports.authenticate = async () => {
  return makeAuthenticationCall(USER_POOL_ID, CLIENT_ID, REFRESH_TOKEN);
};

module.exports.authenticateAdmin = async () => {
  return makeAuthenticationCall(
    ADMIN_POOL_ID,
    ADMIN_CLIENT_ID,
    ADMIN_REFRESH_TOKEN
  );
};

const makeAuthenticationCall = async (poolId, clientId, token) => {
  const { AuthenticationResult } = await cognito
    .adminInitiateAuth({
      AuthFlow: 'REFRESH_TOKEN',
      UserPoolId: poolId,
      ClientId: clientId,
      AuthParameters: {
        REFRESH_TOKEN: token,
      },
    })
    .promise();

  return AuthenticationResult.IdToken;
};
