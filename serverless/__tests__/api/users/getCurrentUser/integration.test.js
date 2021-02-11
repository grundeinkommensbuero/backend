const { INVOKE_URL } = require('../../../testConfig');
const { authenticate } = require('../../../testUtils');
const fetch = require('node-fetch');

let token;

describe('get current user api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should be able to get user', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(`${INVOKE_URL}/users/me`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('user');
    expect(json.user).toHaveProperty('email');
    expect(json.user).toHaveProperty('municipalities');
    expect(json.user.municipalities[0]).toHaveProperty('ags');
    expect(json.user.municipalities[0]).toHaveProperty('createdAt');
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/users/me`, request);

    expect(response.status).toEqual(401);
  });
});
