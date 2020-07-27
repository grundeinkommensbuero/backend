const { INVOKE_URL } = require('../../../testConfig');
const { authenticateAdmin } = require('../../../testUtils');
const fetch = require('node-fetch');

let token;
const listId = '7525800';
const email = 'vali_schagerl@web.de';

describe('adminGetUser api test', () => {
  beforeAll(async () => {
    token = await authenticateAdmin();
  });

  it('should search users by email', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users?email=${email}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('users');
    expect(json.users[0]).toHaveProperty('signatureCount');
  });

  it('should search users by list id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users?listId=${listId}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('users');
    expect(json.users[0]).toHaveProperty('signatureCount');
  });

  it('should not find list', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users?listId=123142`,
      request
    );

    expect(response.status).toEqual(404);
  });

  it('should get power users ', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users?filter=powerusers`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('users');
  });

  it('should not find users', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users?email=vali_schagggerl@web.de`,
      request
    );

    expect(response.status).toEqual(404);
  });
});
