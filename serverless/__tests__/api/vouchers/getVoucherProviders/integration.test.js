const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const {
  INVOKE_URL,
  BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD,
  DEV_VOUCHERS_TABLE,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const uuid = require('uuid/v4');

const ddb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));
const randomWords = require('random-words');

const providerId = randomWords();

describe('getVouchers api test', () => {
  beforeAll(async () => {
    await createVoucher(
      {
        id: providerId,
        name: randomWords(),
        logoUrl: randomWords(),
        shopUrl: randomWords(),
      },
      30
    );
  });

  it('should get all voucher providers', async () => {
    const request = {
      method: 'get',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
    };

    const response = await fetch(`${INVOKE_URL}/vouchers/providers`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('id');
    expect(json.data[0]).toHaveProperty('name');
    expect(json.data[0]).toHaveProperty('shopUrl');
    expect(json.data[0]).toHaveProperty('logoUrl');
    expect(json.data[0]).toHaveProperty('availableOffers');
    expect(json.data[0].availableOffers[0]).toHaveProperty('amount');
    expect(json.data[0].availableOffers[0]).toHaveProperty('countAvailable');

    const newProvider = json.data.find(({ id }) => id === providerId);
    expect(newProvider.id).toEqual(providerId);
    expect(newProvider.availableOffers.length).toEqual(1);
    expect(newProvider.availableOffers[0].amount).toEqual(30);
    expect(newProvider.availableOffers[0].countAvailable).toEqual(1);
  });

  it('should not be authorized', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(401);
  });
});

const createVoucher = (provider, amount) => {
  const params = {
    TableName: DEV_VOUCHERS_TABLE,
    Item: {
      id: uuid(),
      provider,
      amount,
      code: uuid(),
    },
  };

  return ddb.put(params);
};
