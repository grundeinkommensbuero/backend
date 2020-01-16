const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('getSignatureListCount api test', () => {
  it('should get signature list count', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures/lists`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('schleswig-holstein-1');
    expect(json).toHaveProperty('brandenburg-1');

    expect(json['schleswig-holstein-1']).toHaveProperty('total');
    expect(json['schleswig-holstein-1']).toHaveProperty('anonymous');
    expect(json['schleswig-holstein-1']).toHaveProperty('byUser');

    expect(json['schleswig-holstein-1'].total).toHaveProperty('lists');
    expect(json['schleswig-holstein-1'].total).toHaveProperty('downloads');

    expect(json['schleswig-holstein-1'].total.lists).toBeGreaterThan(0);
    expect(json['schleswig-holstein-1'].total.downloads).toBeGreaterThan(0);
  });
});
