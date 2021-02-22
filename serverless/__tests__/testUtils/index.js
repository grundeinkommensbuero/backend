const {
  ADMIN_POOL_ID,
  ADMIN_CLIENT_ID,
  USER_POOL_ID,
  CLIENT_ID,
  USER_ID,
  PASSWORD,
  ADMIN_USER_ID,
  DEV_USER_MUNICIPALITY_TABLE,
  DEV_MUNICIPALITIES_TABLE,
  DEV_USERS_TABLE,
} = require('../testConfig');
const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);

module.exports.authenticate = async (userId = USER_ID) => {
  return makeAuthenticationCall(USER_POOL_ID, CLIENT_ID, userId);
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

module.exports.getUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: DEV_USER_MUNICIPALITY_TABLE,
    Key: {
      ags,
      userId,
    },
  };

  return ddb.get(params).promise();
};

module.exports.createMunicipality = municipality => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Item: municipality,
  };

  return ddb.put(params).promise();
};

module.exports.deleteMunicipality = ags => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Key: {
      ags,
    },
  };

  return ddb.delete(params).promise();
};

module.exports.deleteUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: DEV_USER_MUNICIPALITY_TABLE,
    Key: {
      ags,
      userId,
    },
  };

  return ddb.delete(params).promise();
};

module.exports.removeCustomNewsletters = userId => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'REMOVE customNewsletters',
    ReturnValues: 'UPDATED_NEW',
  };
  return ddb.update(params).promise();
};

module.exports.removeStore = userId => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'REMOVE store',
    ReturnValues: 'UPDATED_NEW',
  };
  return ddb.update(params).promise();
};
