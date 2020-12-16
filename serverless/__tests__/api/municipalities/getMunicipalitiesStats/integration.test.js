const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('getMunicipalitiesStats api test', () => {
  it('should be able to get stats for municipalities and events', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/municipalities`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('events');
    expect(json.data).toHaveProperty('timePassed');
    expect(json.data).toHaveProperty('scale');
    expect(json.data).toHaveProperty('municipalities');

    expect(json.data.municipalities.length).toBeGreaterThan(0);
    expect(json.data.municipalities[0]).toHaveProperty('signups');
    expect(json.data.municipalities[0]).toHaveProperty('ags');

    expect(json.data.events.length).toBeGreaterThan(0);
    expect(json.data.events[0]).toHaveProperty('signups');
    expect(json.data.events[0]).toHaveProperty('ags');
    expect(json.data.events[0]).toHaveProperty('category');
    expect(json.data.events[0].signups.length).toEqual(2);
  });

  it('should be able to get stats for all municipalities', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/municipalities?all=true`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('timePassed');
    expect(json.data).toHaveProperty('scale');
    expect(json.data).toHaveProperty('municipalities');

    expect(json.data.municipalities.length).toBeGreaterThan(0);
    expect(json.data.municipalities[0]).toHaveProperty('signups');
    expect(json.data.municipalities[0]).toHaveProperty('ags');
    expect(json.data.municipalities[0]).toHaveProperty('goal');
  });
});
