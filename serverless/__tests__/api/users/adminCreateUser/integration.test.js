const { INVOKE_URL } = require('../../../testConfig');
const { authenticateAdmin } = require('../../../testUtils');
const fetch = require('node-fetch');
const randomWords = require('random-words');

let token;
const email = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;

describe('adminCreateUser api test', () => {
  beforeAll(async () => {
    token = await authenticateAdmin();
  });

  it('should create a new user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        emails: [email],
        campaignCode: 'berlin-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(200);
  });

  it('should create a new user and update existing', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        emails: [
          email,
          `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        ],
        campaignCode: 'berlin-1',
        extraInfo: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(200);
  });

  it('passed campaign should not exist', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        campaignCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params (campaign)', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params (email)', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        campaignCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        campaignCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/admin/users`, request);

    expect(response.status).toEqual(401);
  });
});
