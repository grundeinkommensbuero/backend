const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('getSignatureHistory api test', () => {
  it('should get signature history without date params', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures/history`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);

    expect(json).toHaveProperty('history');
    expect(json.history).toHaveProperty('berlin-1');
    expect(json.history['berlin-1'].length).toBeGreaterThan(0);
    expect(json.history['berlin-1'][0]).toHaveProperty('day');
    expect(json.history['berlin-1'][0]).toHaveProperty('downloads');
    expect(json.history['berlin-1'][0]).toHaveProperty('usersWhoScanned');
    expect(json.history['berlin-1'][0]).toHaveProperty('received');
    expect(json.history['berlin-1'][0]).toHaveProperty('scanned');
    expect(json.history['berlin-1'][0]).toHaveProperty('scannedLists');
  });

  it('should get signature history with start date', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures/history?start=2020-07-20`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);

    expect(json).toHaveProperty('history');
    expect(json.history).toHaveProperty('berlin-1');
    expect(json.history['berlin-1'].length).toBeGreaterThan(0);
    expect(json.history['berlin-1'][0]).toHaveProperty('day');
    expect(json.history['berlin-1'][0]).toHaveProperty('downloads');
    expect(json.history['berlin-1'][0]).toHaveProperty('usersWhoScanned');
    expect(json.history['berlin-1'][0]).toHaveProperty('received');
    expect(json.history['berlin-1'][0]).toHaveProperty('scanned');
    expect(json.history['berlin-1'][0]).toHaveProperty('scannedLists');
  });

  it('should get signature history with end date', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures/history?end=2020-10-10`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);

    expect(json).toHaveProperty('history');
    expect(json.history).toHaveProperty('berlin-1');
    expect(json.history['berlin-1'].length).toBeGreaterThan(0);
  });

  it('should get signature history with start and end date', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/signatures/history?start=2020-07-20&end=2020-07-28`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);

    expect(json).toHaveProperty('history');
    expect(json.history).toHaveProperty('berlin-1');
    expect(json.history['berlin-1'].length).toBeGreaterThan(0);
    expect(json.history['berlin-1'][0]).toHaveProperty('day');
    expect(json.history['berlin-1'][0]).toHaveProperty('downloads');
    expect(json.history['berlin-1'][0]).toHaveProperty('usersWhoScanned');
    expect(json.history['berlin-1'][0]).toHaveProperty('received');
    expect(json.history['berlin-1'][0]).toHaveProperty('scanned');
    expect(json.history['berlin-1'][0]).toHaveProperty('scannedLists');
  });
});
