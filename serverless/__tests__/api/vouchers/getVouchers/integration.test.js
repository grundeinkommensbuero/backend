const {
  INVOKE_URL,
  BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const { purchaseVoucher } = require('../../../testUtils');

describe('getVouchers api test', () => {
  it('should get all vouchers', async () => {
    const request = {
      method: 'get',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('providerId');
    expect(json.data[0]).toHaveProperty('amount');

    expect(json.data[0].sold).toHaveProperty('transactionId');
    expect(json.data[0].sold).toHaveProperty('timestamp');
    expect(json.data[0].sold).toHaveProperty('safeAddress');

    let allSold = true;
    for (const voucher of json.data) {
      if (!('sold' in voucher)) {
        allSold = false;
      }
    }

    expect(allSold).toEqual(true);
  });

  it('should get all sold vouchers of one address', async () => {
    const safeAddress = 'e9e903e5-311a-4c6d-9317-c2fcd3b8716e';
    await purchaseVoucher(safeAddress);

    const request = {
      method: 'get',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/vouchers?safeAddress=${safeAddress}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('providerId');
    expect(json.data[0]).toHaveProperty('amount');
    expect(json.data[0].sold).toHaveProperty('transactionId');
    expect(json.data[0].sold).toHaveProperty('timestamp');
    expect(json.data[0].sold).toHaveProperty('safeAddress');
    expect(json.data[0].sold.safeAddress).toEqual(safeAddress);

    let allByAddress = true;
    for (const voucher of json.data) {
      if (voucher.sold.safeAddress !== safeAddress) {
        allByAddress = false;
      }
    }

    expect(allByAddress).toEqual(true);
  });

  it('should get all sold vouchers after timestamp', async () => {
    await purchaseVoucher();

    const date = new Date();
    const pastDate = new Date();

    pastDate.setDate(date.getDate() - 2);

    const timestamp = pastDate.toISOString();

    const request = {
      method: 'get',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/vouchers?timestamp=${timestamp}`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('providerId');
    expect(json.data[0]).toHaveProperty('amount');
    expect(json.data[0].sold).toHaveProperty('transactionId');
    expect(json.data[0].sold).toHaveProperty('timestamp');
    expect(json.data[0].sold).toHaveProperty('safeAddress');

    let allAfterDate = true;
    for (const voucher of json.data) {
      if (new Date(voucher.sold.timestamp) < new Date(timestamp)) {
        allAfterDate = true;
      }
    }

    expect(allAfterDate).toEqual(true);
  });

  it('should get all sold vouchers of one address after date', async () => {
    const safeAddress = 'e9e903e5-311a-4c6d-9317-c2fcd3b8716e';

    await purchaseVoucher(safeAddress);

    const date = new Date();
    const pastDate = new Date();

    pastDate.setDate(date.getDate() - 2);

    const timestamp = pastDate.toISOString();

    const request = {
      method: 'get',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
    };

    const response = await fetch(
      `${INVOKE_URL}/vouchers?safeAddress=${safeAddress}&timestamp=${timestamp}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data[0]).toHaveProperty('providerId');
    expect(json.data[0]).toHaveProperty('amount');
    expect(json.data[0].sold).toHaveProperty('transactionId');
    expect(json.data[0].sold).toHaveProperty('timestamp');
    expect(json.data[0].sold).toHaveProperty('safeAddress');
    expect(json.data[0].sold.safeAddress).toEqual(safeAddress);

    let allByAddressAndAfterDate = true;
    for (const voucher of json.data) {
      if (
        voucher.sold.safeAddress !== safeAddress ||
        new Date(voucher.sold.timestamp) < new Date(timestamp)
      ) {
        allByAddressAndAfterDate = false;
      }
    }

    expect(allByAddressAndAfterDate).toEqual(true);
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
