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
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user with phone number', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        phoneNumber: '004964423893023',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user with newsletter consent and source', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        source: 'test-source',
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
        userId,
        email: 'vali_schagerl@web.de',
        referral: 'test-referral',
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(401);
  });

  it('should have missing email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing user id', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have wrong email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have wrong phone number', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        phoneNumber: '0151a7953677',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have wrong zip code', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '2074',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing newsletter consent', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });
});
