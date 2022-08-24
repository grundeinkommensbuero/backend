const fetch = require('node-fetch').default;
const AWS = require('aws-sdk');
const { sleep } = require('../utils');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = process.env.USERS_TABLE_NAME;

const CIRCLES_URL = 'https://voucher-server.circles.pink';

const trustCirclesUser = async safeAddress => {
  await fetch(`${CIRCLES_URL}/trust-users`, {
    headers: {
      Authorization: `Basic ${process.env.CIRCLES_BASIC_AUTH}`,
    },
    body: {
      safeAddresses: [safeAddress],
    },
    method: 'POST',
  });

  // Api might not have worked, which is why we check the status
  // and try again
  if (!(await getCirclesTrustStatus(safeAddress))) {
    await sleep(500);
    await trustCirclesUser(safeAddress);
  }
};

const getCirclesTrustStatus = async safeAddress => {
  const result = await fetch(`${CIRCLES_URL}/trusts-report`, {
    headers: {
      Authorization: `Basic ${process.env.CIRCLES_BASIC_AUTH}`,
    },
    body: {
      safeAddresses: [safeAddress],
    },
    method: 'POST',
  });

  if (result.status === 404 || result.status === 500) {
    return false;
  }

  const { trusted } = await result.json();

  if (trusted.includes(safeAddress)) {
    return true;
  }

  return false;
};

const enableShop = user => {
  // Keep all existing keys, add new ones, and overwrite
  // if keys are in existing store and in request
  const newStore = { ...user.store, enableVoucherStore: true };

  const params = {
    TableName: tableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'Set #store = :store',
    ExpressionAttributeValues: {
      ':store': newStore,
    },
    ExpressionAttributeNames: {
      '#store': 'store',
    },
  };

  return ddb.update(params).promise();
};

module.exports = {
  trustCirclesUser,
  enableShop,
};
