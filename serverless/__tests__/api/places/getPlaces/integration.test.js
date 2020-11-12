const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('getPlaces api test', () => {
  it('should be able to get places', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/places`, request);
    const json = await response.json();

    expect(json).toHaveProperty('data');
    expect(typeof json.data).toEqual('object');
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('longitude');
    expect(json.data[0]).toHaveProperty('latitude');
    expect(json.data[0]).toHaveProperty('ags');
    expect(json.data[0]).toHaveProperty('zipCodes');
    expect(json.data[0]).toHaveProperty('district');
    expect(json.data[0]).toHaveProperty('state');
    expect(json.data[0]).toHaveProperty('population');

    expect(response.status).toEqual(200);
  });
});
