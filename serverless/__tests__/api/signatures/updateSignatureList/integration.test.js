const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const listId = '7525800';
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const email = 'vali_schagerl@web.de';

describe('updateSignatureList by user api test', () => {
  it('should update signature list by list id', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should update signature list by list id with parsed count', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: '6',
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find signature list by list id ', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/123456`, request);

    expect(response.status).toEqual(404);
  });

  it('should update signature list by user id', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 11,
        userId: userId,
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        userId: '123456',
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(404);
  });

  it('should update signature list by email', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 11,
        email: email,
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find user by email', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        email: 'wrongEmail@web.de',
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(404);
  });

  it('should have incorrect count', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 'blub',
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should have incorrect count', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 5000,
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should have incorrect count', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: -4,
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(400);
  });
});
