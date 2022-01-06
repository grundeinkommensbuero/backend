const { DEV_USERS_TABLE, INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const { getUser } = require('../../../../../utils/shared/users/getUsers');
const {
  authenticateAdmin,
  createUser,
  getCognitoUser,
} = require('../../../testUtils');

let userId;
const email = 'delete.test@expedition-grundeinkommen.de';

let token;

describe('adminUpdateUser api test', () => {
  beforeAll(async () => {
    token = await authenticateAdmin();
    userId = await createUser(email);
  });

  it('should be able to delete user', async () => {
    const request = {
      method: 'DELETE',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users/${userId}`,
      request
    );

    expect(response.status).toEqual(204);

    // Get user to check if deleted
    const result = await getUser(DEV_USERS_TABLE, userId);
    expect('Item' in result).toEqual(false);

    try {
      await getCognitoUser(userId);
    } catch (error) {
      expect(error.code).toEqual('UserNotFoundException');
    }
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'DELETE',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users/${userId}`,
      request
    );

    expect(response.status).toEqual(401);
  });
});
