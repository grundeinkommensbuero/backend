const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const uuid = require('uuid/v4');

const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';

describe('createPledge api test', () => {
  it('should create a new pledge/new user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
        username: 'Vali',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('user');
  });

  it('should not be able to create a new pledge', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId,
        email: 'vali_schagerl@web.de',
        pledgeId: 'schleswig-holstein-1',
        signatureCount: 6,
        newsletterConsent: true,
        zipCode: '72074',
        name: randomWords(),
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);

    expect(response.status).toEqual(401);
  });

  it('should create general pledge with message', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        pledgeId: 'general-1',
        message:
          'Ich habe eine ganz spezielle Frage an euch! Was macht ihr so am Wochenende?',
        zipCode: '72074',
        city: 'Tübingen',
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/pledges`, request);
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('user');
  });
});
