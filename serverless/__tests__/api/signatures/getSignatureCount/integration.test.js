const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('getSignatureCount api test', () => {
  it('should get signature count', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/analytics/signatures`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('schleswig-holstein-1');
    expect(json['schleswig-holstein-1']).toHaveProperty('withMixed');
    expect(json['schleswig-holstein-1']).toHaveProperty('withoutMixed');
  });
});
