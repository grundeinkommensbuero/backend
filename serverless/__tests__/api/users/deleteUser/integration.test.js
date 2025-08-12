const {
  INVOKE_URL,
  USER_POOL_ID,
  DEV_USERS_TABLE,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const randomWords = require('random-words');

const config = { region: 'eu-central-1' };
const cognito = new CognitoIdentityProvider(config);
const { getUser } = require('../../../../../utils/shared/users/getUsers');
const {
  authenticate,
  createUser,
  getCognitoUser,
} = require('../../../testUtils');
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

  it('should not be able to authorize', async () => {
    const request = {
      method: 'DELETE',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/users/${testUserId}`, request);

    expect(response.status).toEqual(401);
  });
});

// We need to set a password so we are able to authenticate new user
const setPassword = userId => {
  const params = {
    UserPoolId: USER_POOL_ID,
    Username: userId,
    Password: PASSWORD,
    Permanent: true,
  };

  return cognito.adminSetUserPassword(params);
};
