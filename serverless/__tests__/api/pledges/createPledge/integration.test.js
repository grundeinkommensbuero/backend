const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');

describe('createPledge api test', () => {
  it('should create a new pledge via userId', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: 'dd34ebe3-71cd-445b-b651-bd88ebebf459',
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 6,
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(204);
  });

  it('should create a new pledge via email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: 'vali_schagerl@web.de',
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 6,
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(204);
  });

  it('should not be able to create a new pledge via userId', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: 'dd34ebe3-71cd-445b-b651-bd88ebebf459',
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(401);
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
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(400);
  });
});
