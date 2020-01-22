const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const userId = '64d87c55-4caa-4733-b689-7f1bd3defd0f';
const userWithoutConsentId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

describe('createPledge api test', () => {
  it('should create a new pledge for existing user via userId', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(204);
  });

  it('should create a new pledge for existing user via email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: 'vali_schagerl@web.de',
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(204);
  });

  it('should not create a new pledge via userId', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find user via user id', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: '123456789',
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(400);
  });

  it('should not find user via email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: 'wrongMail@web.de',
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(400);
  });

  it('should create changedNewsletter field', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: userWithoutConsentId,
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(204);
  });

  it('should create general pledge with message', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        pledgeId: `general-1`,
        message:
          'Ich habe eine ganz spezielle Frage an euch! Was macht ihr so am Wochenende?',
        zipCode: '72074',
        city: 'Tübingen',
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(204);
  });
});
