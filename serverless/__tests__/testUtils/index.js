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
  BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD,
  INVOKE_URL,
} = require('../testConfig');

const {
  CognitoIdentityProvider,
} = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const ddb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));

const config = { region: 'eu-central-1' };
const cognito = new CognitoIdentityProvider(config);

const fetch = require('node-fetch');
const uuid = require('uuid/v4');

module.exports.authenticate = async (userId = USER_ID) => {
  return makeAuthenticationCall(USER_POOL_ID, CLIENT_ID, userId);
};

module.exports.authenticateAdmin = async () => {
  return makeAuthenticationCall(ADMIN_POOL_ID, ADMIN_CLIENT_ID, ADMIN_USER_ID);
};

const makeAuthenticationCall = async (poolId, clientId, userId) => {
  const { AuthenticationResult } = await cognito.adminInitiateAuth({
    AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
    UserPoolId: poolId,
    ClientId: clientId,
    AuthParameters: {
      USERNAME: userId,
      PASSWORD,
    },
  });
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

  return ddb.get(params);
};

module.exports.createMunicipality = municipality => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Item: municipality,
  };

  return ddb.put(params);
};

module.exports.deleteMunicipality = ags => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Key: {
      ags,
    },
  };

  return ddb.delete(params);
};

module.exports.deleteUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: DEV_USER_MUNICIPALITY_TABLE,
    Key: {
      ags,
      userId,
    },
  };

  return ddb.delete(params);
};

module.exports.removeCustomNewsletters = userId => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'REMOVE customNewsletters',
    ReturnValues: 'UPDATED_NEW',
  };
  return ddb.update(params);
};

module.exports.removeStore = userId => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'REMOVE #store',
    ExpressionAttributeNames: { '#store': 'store' },
    ReturnValues: 'UPDATED_NEW',
  };
  return ddb.update(params);
};

module.exports.removeListFlow = userId => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'REMOVE listFlow',
    ReturnValues: 'UPDATED_NEW',
  };
  return ddb.update(params);
};

// Creates user in cognito and dynamo
module.exports.createUser = async email => {
  const { User } = await createUserInCognito(email);
  await createUserInDynamo(User.Username, email);

  // return userId
  return User.Username;
};

// Create a new cognito user in our user pool
const createUserInCognito = email => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: email.toLowerCase(),
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
      {
        Name: 'email',
        Value: email.toLowerCase(),
      },
    ],
    MessageAction: 'SUPPRESS', // we don't want to send an "invitation mail"
  };

  return cognito.adminCreateUser(params);
};

// Create user in dynamo db
const createUserInDynamo = (userId, email, attributes) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: DEV_USERS_TABLE,
    Item: {
      cognitoId: userId,
      email,
      createdAt: timestamp,
      ...attributes,
    },
  };

  return ddb.put(params);
};

module.exports.getCognitoUser = userId => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: userId,
  };

  return cognito.adminGetUser(params);
};

module.exports.purchaseVoucher = safeAddress => {
  // Purchase voucher
  const transactionId = uuid();

  const postRequest = {
    method: 'POST',
    mode: 'cors',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
      ).toString('base64')}`,
    },
    body: JSON.stringify({
      safeAddress: safeAddress || uuid(),
      providerId: 'goodbuy',
      amount: 25,
      transactionId,
    }),
  };

  return fetch(`${INVOKE_URL}/vouchers`, postRequest);
};

module.exports.createUserInDynamo = createUserInDynamo;
