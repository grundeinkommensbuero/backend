const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';

describe('getUser api test', () => {
  it('should be able to get user', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);
    const json = await response.json();

    expect(json).toHaveProperty('user');
    expect(json.user).toHaveProperty('profilePictures');
    expect(json.user).toHaveProperty('hasZipCode');
    expect(json.user).toHaveProperty('questions');

    expect(response.status).toEqual(200);
  });
});
