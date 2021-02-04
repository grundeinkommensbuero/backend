const AWS = require('aws-sdk');
const { DEV_ADMIN_POOL_ID } = require('../../config');

const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);

const updateCognitoUser = (userPoolId, userId, ags) => {
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
    UserAttributes: [{ Name: 'custom:ags', Value: ags }],
  };

  return cognito.adminUpdateUserAttributes(params).promise();
};

updateCognitoUser(
  DEV_ADMIN_POOL_ID,
  'b9e7d6c2-855d-4f2c-be08-a32cbaa63ef5',
  '11000000'
);
