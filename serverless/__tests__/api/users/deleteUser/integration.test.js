const {
  INVOKE_URL,
  USER_POOL_ID,
  DEV_USERS_TABLE,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const randomWords = require('random-words');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const { getUser } = require('../../../../../utils/shared/users/getUsers');
const { authenticate } = require('../../../testUtils');
const { PASSWORD } = require('../../../secretConfig');

let testUserId;
let token;

describe('deleteUser api test', () => {
  beforeAll(async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    testUserId = await createUser(randomEmail);
    await setPassword(testUserId);

    token = await authenticate(testUserId);
  });

  it('should be able to delete user', async () => {
    const request = {
      method: 'DELETE',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(`${INVOKE_URL}/users/${testUserId}`, request);

    expect(response.status).toEqual(204);

    // Get user to check if deleted
    const result = await getUser(DEV_USERS_TABLE, testUserId);
    expect('Item' in result).toEqual(false);

    try {
      await getCognitoUser(testUserId);
    } catch (error) {
      expect(error.code).toEqual('UserNotFoundException');
    }
  });
});

const createUser = async email => {
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

  return cognito.adminCreateUser(params).promise();
};

// We need to set a password so we are able to authenticate new user
const setPassword = userId => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: userId,
    Password: PASSWORD,
    Permanent: true,
  };

  return cognito.adminSetUserPassword(params).promise();
};

// Create user in dynamo db
const createUserInDynamo = (userId, email) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: DEV_USERS_TABLE,
    Item: {
      cognitoId: userId,
      email,
      createdAt: timestamp,
    },
  };

  return ddb.put(params).promise();
};

const getCognitoUser = userId => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: userId,
  };

  return cognito.adminGetUser(params).promise();
};
