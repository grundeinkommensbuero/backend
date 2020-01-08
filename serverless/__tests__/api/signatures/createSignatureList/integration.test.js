const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const userId = '64d87c55-4caa-4733-b689-7f1bd3defd0f';

describe('createSignatureList api test', () => {
  it('should create a new signature list via userId', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        campaignCode: `schleswig-holstein-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should create a new signature list via email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: 'vali_schagerl@web.de',
        campaignCode: `schleswig-holstein-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should not find user via user id', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: '123456789',
        campaignCode: `schleswig-holstein-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(400);
  });

  it('should not find user via email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: 'wrongMail@web.de',
        campaignCode: `schleswig-holstein-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(400);
  });
});
