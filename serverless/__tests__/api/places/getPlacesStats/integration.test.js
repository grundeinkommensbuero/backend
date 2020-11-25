const { INVOKE_URL, DEV_MUNICIPALITIES_TABLE } = require('../../../testConfig');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const crypto = require('crypto-secure-random-digit');
const uuid = require('uuid/v4');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const randomAgs = crypto.randomDigits(6).join('');

describe('getPlacesStats api test', () => {
  beforeAll(async () => {
    const timestamp = new Date().toISOString();

    await createMunicipality(randomAgs, [
      { id: uuid(), createdAt: timestamp },
      { id: uuid(), createdAt: timestamp },
      { id: uuid(), createdAt: timestamp },
    ]);
  });

  it('should be able to overall stats for all signups', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/analytics/places`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('data');
    expect(typeof json.data).toEqual('object');
    expect(json.data).toHaveProperty('signups');
    expect(json.data.signups).toBeGreaterThan(0);
  });

  it('should be able to stats for one municipality', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/analytics/places?ags=${randomAgs}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('data');
    expect(typeof json.data).toEqual('object');
    expect(json.data).toHaveProperty('signups');
    expect(json.data).toHaveProperty('percentToGoal');
    expect(json.data.signups).toEqual(3);
  });

  afterAll(async () => {
    await deleteMunicipality(randomAgs);
  });
});

const createMunicipality = (ags, users) => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Item: {
      ags,
      users,
    },
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
