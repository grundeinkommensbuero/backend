const { INVOKE_URL } = require('../../../testConfig');
const { authenticateAdmin } = require('../../../testUtils');

const fetch = require('node-fetch');
const randomWords = require('random-words');

const listId = '7525800';

let token;

describe('adminCreateUser api test', () => {
  beforeAll(async () => {
    token = await authenticateAdmin();
  });

  it('should update signature list', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        count: 5,
        mixed: false,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/signatures/${listId}`,
      request
    );

    expect(response.status).toEqual(200);
  });

  it('should not find list', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        mixed: false,
        count: 5,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/signatures/123679`,
      request
    );

    expect(response.status).toEqual(404);
  });

  it('should have missing params (mixed)', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        count: 5,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/signatures/${listId}`,
      request
    );

    expect(response.status).toEqual(400);
  });

  it('should have missing params (count)', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        mixed: false,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/signatures/${listId}`,
      request
    );

    expect(response.status).toEqual(400);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        campaignCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/signatures/${listId}`,
      request
    );

    expect(response.status).toEqual(401);
  });
});
