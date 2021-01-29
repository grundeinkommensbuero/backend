const { INVOKE_URL } = require('../../../testConfig');
const { authenticateAdmin } = require('../../../testUtils');
const fetch = require('node-fetch');

let token;
const email = 'vali_schagerl@web.de';

describe('adminGetDonations api test', () => {
  beforeAll(async () => {
    token = await authenticateAdmin();
  });

  it('should get donations', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
    };

    const response = await fetch(`${INVOKE_URL}/admin/donations`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('donations');
    expect(json.donations).toHaveProperty('recurringDonations');
    expect(json.donations).toHaveProperty('onetimeDonations');
  });
});
