const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

let token;

describe('get meetups api test', () => {
  it('should get meetups', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/meetups`, request);

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('data');
    expect(json.data.length).toBeGreaterThan(0);
  });
});
