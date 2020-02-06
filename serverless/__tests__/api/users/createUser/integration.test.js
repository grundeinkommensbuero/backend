const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const userId = '64d87c55-4caa-4733-b689-7f1bd3defd0f';
const uuid = require('uuid/v4');

describe('createUser api test', () => {
  it('should create a new user with newsletter consent', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user without newsletter consent', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(201);
  });

  it('should not be authorized to overwrite user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        email: 'vali_schagerl@web.de',
        referral: 'test-referral',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(401);
  });
});
