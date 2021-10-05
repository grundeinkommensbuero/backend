const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';

describe('getUser api test', () => {
  it('should be able to get user', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);
    const json = await response.json();

    expect(json).toHaveProperty('user');
    expect(json.user).toHaveProperty('hasZipCode');
    expect(json.user).toHaveProperty('questions');
    expect(json.user).toHaveProperty('municipalities');

    expect(response.status).toEqual(200);
  });
});
