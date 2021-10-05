const { INVOKE_URL } = require('../../../testConfig');
const { authenticate } = require('../../../testUtils');
const fetch = require('node-fetch');
const randomWords = require('random-words');

const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

let token;

describe('updatePledge api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should be able to add new pledge', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        pledgeId: `${randomWords()}-${randomWords()}-1`,
        signatureCount: 13,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

    expect(response.status).toEqual(204);
  });

  it('should be able to update existing pledge', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        pledgeId: 'berlin-1',
        signatureCount: 13,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

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
        pledgeId: 'schleswig-holstein-1',
        signatureCount: 6,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${otherUserId}/pledges`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        pledgeId: 'schleswig-holstein-1',
        signatureCount: 6,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should have missing pledge id', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        signatureCount: 6,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

    expect(response.status).toEqual(400);
  });
});
