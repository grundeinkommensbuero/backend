const {
  INVOKE_URL,
  BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const uuid = require('uuid/v4');
const { purchaseVoucher, createUserInDynamo } = require('../../../testUtils');

const oneTransactionId = uuid();

describe('purchaseVoucher api test', () => {
  it('should purchase a voucher', async () => {
    const safeAddress = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 25,
        transactionId: oneTransactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('providerId');
    expect(json.data).toHaveProperty('amount');
    expect(json.data).toHaveProperty('sold');
    expect(json.data.sold).toHaveProperty('transactionId');
    expect(json.data.sold).toHaveProperty('timestamp');
    expect(json.data.sold).toHaveProperty('safeAddress');

    expect(json.data.sold.safeAddress).toEqual(safeAddress);
    expect(json.data.sold.transactionId).toEqual(oneTransactionId);
    expect(json.data.amount).toEqual(25);
  });

  it('should not be able to use same transaction id', async () => {
    const safeAddress = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 25,
        transactionId: oneTransactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(400);

    const json = await response.json();

    expect(json.error).toEqual('transactionIdUsed');
  });

  it('should not be able to purchase due to limit', async () => {
    const safeAddress = uuid();
    const transactionId = uuid();

    await purchaseVoucher(safeAddress);
    await purchaseVoucher(safeAddress);

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 25,
        transactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(403);
  });

  it('should be able to purchase due to higher individual limit', async () => {
    const safeAddress = uuid();
    const transactionId = uuid();

    await createUserInDynamo(
      uuid(),
      'testVoucher@expedition-grundeinkommen.de',
      { circlesSafeAddress: safeAddress, circlesLimit: 66 }
    );

    console.log('safe address', safeAddress);
    await purchaseVoucher(safeAddress);

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 25,
        transactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json.data).toHaveProperty('id');
    expect(json.data).toHaveProperty('providerId');
    expect(json.data).toHaveProperty('amount');
    expect(json.data).toHaveProperty('sold');
    expect(json.data.sold).toHaveProperty('transactionId');
    expect(json.data.sold).toHaveProperty('timestamp');
    expect(json.data.sold).toHaveProperty('safeAddress');

    expect(json.data.sold.safeAddress).toEqual(safeAddress);
    expect(json.data.sold.transactionId).toEqual(transactionId);
    expect(json.data.amount).toEqual(25);
  });

  it('should not be able to purchase due to individual limit', async () => {
    const safeAddress = uuid();
    const transactionId = uuid();

    await createUserInDynamo(
      uuid(),
      'testVoucher@expedition-grundeinkommen.de',
      { circlesSafeAddress: safeAddress, circlesLimit: 66 }
    );

    await purchaseVoucher(safeAddress);
    await purchaseVoucher(safeAddress);

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 25,
        transactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(403);
  });

  it('should not find a voucher for amount', async () => {
    const safeAddress = uuid();
    const transactionId = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 30,
        transactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(404);
  });

  // it('should not find a voucher for amount because all are sold', async () => {
  //   const safeAddress = uuid();
  //   const transactionId = uuid();

  //   const request = {
  //     method: 'POST',
  //     mode: 'cors',
  //     headers: {
  //       Authorization: `Basic ${Buffer.from(
  //         `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
  //       ).toString('base64')}`,
  //     },
  //     body: JSON.stringify({
  //       safeAddress,
  //       providerId: 'goodbuy',
  //       amount: 300,
  //       transactionId,
  //     }),
  //   };

  //   const response = await fetch(`${INVOKE_URL}/vouchers`, request);

  //   expect(response.status).toEqual(404);
  // });

  it('should have missing params', async () => {
    const transactionId = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        providerId: 'goodbuy',
        amount: 200,
        transactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params', async () => {
    const safeAddress = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 200,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params', async () => {
    const safeAddress = uuid();
    const transactionId = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        transactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params', async () => {
    const safeAddress = uuid();
    const transactionId = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        safeAddress,
        transactionId,
        amount: 30,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be authorized', async () => {
    const safeAddress = uuid();
    const transactionId = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        safeAddress,
        providerId: 'goodbuy',
        amount: 30,
        transactionId,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/vouchers`, request);

    expect(response.status).toEqual(401);
  });
});
