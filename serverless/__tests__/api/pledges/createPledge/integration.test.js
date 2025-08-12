const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../testConfig');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const fetch = require('node-fetch');
const { authenticate } = require('../../../testUtils');

const ddb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));
const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';
let token;

describe('createPledge api test', () => {
  beforeAll(async () => {
    await removePledges();
    token = await authenticate();
  });

  it('should create a new pledge for a user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        pledgeId: 'berlin-1',
        signatureCount: 6,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('userId');
    expect(json).toHaveProperty('pledge');
  });

  it('should create a new berlin 2 pledge for a user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        pledgeId: 'berlin-2',
        signatureCount: 6,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('userId');
    expect(json).toHaveProperty('pledge');
  });

  it('should not be able to create the same pledge twice', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        pledgeId: 'berlin-1',
        signatureCount: 6,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should create general pledge with message', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        pledgeId: 'general-1',
        message:
          'Ich habe eine ganz spezielle Frage an euch! Was macht ihr so am Wochenende?',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('userId');
    expect(json).toHaveProperty('pledge');
  });

  it('should have missing pledge id', async () => {
    const request = {
      method: 'POST',
      headers: {
        Authorization: token,
      },
      mode: 'cors',
      body: JSON.stringify({}),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/pledges`,
      request
    );

    expect(response.status).toEqual(400);
  });
});

const removePledges = async () => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'REMOVE pledges',
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params);
};
