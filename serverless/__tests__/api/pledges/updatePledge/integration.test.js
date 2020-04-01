const { INVOKE_URL } = require('../../../testConfig');
const { authenticate } = require('../../../testUtils');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

let token;

describe('updatePledge api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should be able to update user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        userId: userId,
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 13,
        newsletterConsent: true,
        zipCode: '72074',
        name: randomWords(),
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not be able to change other user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },

      body: JSON.stringify({
        userId: userId,
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/pledges/${otherUserId}`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        pledgeId: `schleswig-holstein-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges/${userId}`, request);

    expect(response.status).toEqual(401);
  });
});
