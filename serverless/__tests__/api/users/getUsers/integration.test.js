const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const email = 'vali_schagerl@web.de';

describe('getUsers api test', () => {
  it('should be able to get user via mail', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/users?email=${email}`, request);
    const json = await response.json();

    expect(json).toHaveProperty('users');
    expect(json.users[0]).toHaveProperty('userId');

    expect(response.status).toEqual(200);
  });
});
