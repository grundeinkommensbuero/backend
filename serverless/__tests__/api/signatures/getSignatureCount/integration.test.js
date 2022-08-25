const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

const listId = '7525800';
const userId = 'f0c844ec-2786-4fe6-95c2-0d427e58560d';
const email = 'valentin@expedition-grundeinkommen.de';

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
    expect(json['schleswig-holstein-1']).toHaveProperty('scannedByUser');
    expect(json['schleswig-holstein-1']).toHaveProperty('computed');

    expect(json['schleswig-holstein-1'].withMixed).toBeGreaterThan(0);
    expect(json['schleswig-holstein-1'].computed).toBeGreaterThan(0);
    expect(json['schleswig-holstein-1'].scannedByUser).toBeGreaterThan(0);
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

    expect(json).toHaveProperty('receivedList');
    expect(json).toHaveProperty('scannedByUserList');

    expect(json.receivedList.length).toBeGreaterThan(0);
    expect(json.scannedByUserList.length).toBeGreaterThan(0);
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

    expect(json).toHaveProperty('receivedList');
    expect(json).toHaveProperty('scannedByUserList');

    expect(json.receivedList.length).toBeGreaterThan(0);
    expect(json.scannedByUserList.length).toBeGreaterThan(0);
  });

  it('should get signature count of user by email', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?email=${email}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('received');
    expect(json).toHaveProperty('scannedByUser');

    expect(json).toHaveProperty('receivedList');
    expect(json).toHaveProperty('scannedByUserList');

    expect(json.receivedList.length).toBeGreaterThan(0);
    expect(json.scannedByUserList.length).toBeGreaterThan(0);
  });

  it('should not find list by list id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const wrongListId = '123456';

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?listId=${wrongListId}`,
      request
    );

    expect(response.status).toEqual(404);
  });

  it('should not find user by user id', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const wrongUserId = '212123456';

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?userId=${wrongUserId}`,
      request
    );

    expect(response.status).toEqual(404);
  });

  it('should not find user by email', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const wrongEmail = 'wrongEmail@web.de';

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures?email=${wrongEmail}`,
      request
    );

    expect(response.status).toEqual(404);
  });
});
