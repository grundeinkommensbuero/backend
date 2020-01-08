const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const listId = '1280305';
const userId = '64d87c55-4caa-4733-b689-7f1bd3defd0f';
const email = 'vali_schagerl@web.de';

describe('updateSignatureList by user api test', () => {
  it('should update signature list by list id', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        listId: listId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find signature list by list id ', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        listId: '123456',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(404);
  });

  it('should update signature list by user id', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 11,
        userId: userId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find signature list by user id ', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        userId: '123456',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(404);
  });

  it('should update signature list by email', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 11,
        email: email,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find user by email', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
        email: 'wrongEmail@web.de',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(404);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);

    expect(response.status).toEqual(400);
  });
});
