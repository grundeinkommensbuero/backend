const { INVOKE_URL, DEV_MUNICIPALITIES_TABLE } = require('../../../testConfig');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const crypto = require('crypto-secure-random-digit');
const uuid = require('uuid/v4');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const randomAgs = crypto.randomDigits(6).join('');
const population = 2000;

describe('getMunicipalitiesStats api test', () => {
  beforeAll(async () => {
    const timestamp = new Date().toISOString();

    await createMunicipality({
      ags: randomAgs,
      users: [
        { id: uuid(), createdAt: timestamp },
        { id: uuid(), createdAt: timestamp },
        { id: uuid(), createdAt: timestamp },
      ],
      population,
    });
  });

  afterAll(async () => {
    await deleteMunicipality(randomAgs);
  });

  it('should be able to get stats for all municipalities', async () => {
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
});

const createMunicipality = municipality => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Item: municipality,
  };

  return ddb.put(params).promise();
};

const deleteMunicipality = ags => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Key: {
      ags,
    },
  };

  return ddb.delete(params).promise();
};
