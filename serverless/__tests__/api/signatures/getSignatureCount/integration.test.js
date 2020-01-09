const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const listId = '1280305';
const userId = '64d87c55-4caa-4733-b689-7f1bd3defd0f';

describe('getSignatureCount api test', () => {
  it('should get signature count of all lists', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/analytics/signatures`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('schleswig-holstein-1');
    expect(json['schleswig-holstein-1']).toHaveProperty('withMixed');
    expect(json['schleswig-holstein-1']).toHaveProperty('withoutMixed');
  });

  it('should get signature count of user by list id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?listId=${listId}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('received');
    expect(json).toHaveProperty('scannedByUser');
  });

  it('should get signature count of user by user id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?userId=${userId}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('received');
    expect(json).toHaveProperty('scannedByUser');
  });

  it('should get signature count of user by list id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?listId=${listId}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('received');
    expect(json).toHaveProperty('scannedByUser');
  });

  it('should not find list by list id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const listId = '123456';

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?listId=${listId}`,
      request
    );

    expect(response.status).toEqual(404);
  });

  it('should not find any lists of user by user id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const userId = '123456';

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?userId=${userId}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);

    expect(json).toHaveProperty('received');
    expect(json).toHaveProperty('scannedByUser');

    expect(json.received).toEqual(0);
    expect(json.scannedByUser).toEqual(0);
  });
});
