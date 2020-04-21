const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
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

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user without passed newsletter consent', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user with question', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        question: 'Was machst du heute Abend?',
        zipCode: '12456',
        username: 'Wall-E',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

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

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(401);
  });
});
