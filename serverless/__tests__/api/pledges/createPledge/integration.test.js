const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../testConfig');
const AWS = require('aws-sdk');
const fetch = require('node-fetch');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';

describe('createPledge api test', () => {
  beforeAll(async () => {
    await removePledges();
  });

  it('should create a new pledge for a user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
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

  it('should not be able to create the same pledge twice', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
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

  return ddb.update(params).promise();
};
