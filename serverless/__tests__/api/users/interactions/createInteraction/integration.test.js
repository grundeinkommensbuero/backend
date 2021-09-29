const { INVOKE_URL } = require('../../../../testConfig');
const fetch = require('node-fetch');
const { authenticate } = require('../../../../testUtils');

const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';
let token;

describe('createInteraction api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should create interaction with type pledge', async () => {
    const body = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ body, type: 'pledge' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/interactions`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json.interaction.body).toEqual(body);
    expect(json.interaction.type).toEqual('pledge');
  });

  it('should create interaction with type question and campaignCode', async () => {
    const body = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        body,
        type: 'question',
        campaignCode: 'berlin-2',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/interactions`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json.interaction.body).toEqual(body);
    expect(json.interaction.type).toEqual('question');
    expect(json.interaction.campaign.code).toEqual('berlin-2');
  });

  it('should have missing type', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ body: 'blub' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/interactions`,
      request
    );

    expect(response.status).toEqual(400);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ body: 'blub' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/interactions`,
      request
    );

    expect(response.status).toEqual(401);
  });
});
