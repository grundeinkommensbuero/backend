const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('getMunicipalitiesStats api test', () => {
  it('should be able to get active user count', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/active-users`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('count');
    expect(json.data).toHaveProperty('emailActivityCount');
    expect(json.data).toHaveProperty('websiteActivityCount');
  });
});
