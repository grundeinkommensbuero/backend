const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const email = 'vali_schagerl@web.de';

describe('updateUser api test', () => {
  it('should create changedNewsletter field without referral', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({}),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should create changedNewsletter field', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        referral: 'test-referral',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should create changedNewsletter field by email', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        referral: 'test-referral',
        email: email,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/000`, request);

    expect(response.status).toEqual(204);
  });
});
