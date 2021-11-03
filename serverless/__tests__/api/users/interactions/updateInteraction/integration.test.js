const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../../testConfig');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const { authenticate } = require('../../../../testUtils');
const uuid = require('uuid/v4');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });
const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';
let token;
const interactionId = uuid();
const { getUser } = require('../../../../../../utils/shared/users/getUsers');

const testInteraction = {
  body: 'Ich will auch sammeln!',
  createdAt: '2021-10-01T11:17:20.244Z',
  type: 'pledgePackage',
  campaign: { code: 'berlin-2', round: 2, state: 'berlin' },
  id: interactionId,
};

describe('updateInteraction api test', () => {
  beforeAll(async () => {
    token = await authenticate();
    await createInteractions([testInteraction]);
  });

  it('should update interaction body', async () => {
    const body = 'Was machst du am Freitag?';

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ body }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/interactions/${interactionId}`,
      request
    );

    expect(response.status).toEqual(204);

    // Get user to check if saved correctly

    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(user.interactions[0].id).toEqual(testInteraction.id);
    expect(user.interactions[0].type).toEqual(testInteraction.type);
    expect(user.interactions[0].createdAt).toEqual(testInteraction.createdAt);
    expect(user.interactions[0].campaign).toEqual(testInteraction.campaign);
    expect(user.interactions[0].body).toEqual(body);
    expect(user.interactions[0]).toHaveProperty('updatedAt');
  });

  it('should not update id', async () => {
    const body = 'Was machst du am Freitag?';

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ id: 'blub' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/interactions/${interactionId}`,
      request
    );

    expect(response.status).toEqual(204);

    // Get user to check if saved correctly

    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(user.interactions[0].id).toEqual(testInteraction.id);
    expect(user.interactions[0]).toHaveProperty('updatedAt');
  });

  it('should update body and add flag', async () => {
    const body = 'Was machst du am Samstag?';

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ body, done: true }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/interactions/${interactionId}`,
      request
    );

    expect(response.status).toEqual(204);

    // Get user to check if saved correctly

    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(user.interactions[0].id).toEqual(testInteraction.id);
    expect(user.interactions[0].type).toEqual(testInteraction.type);
    expect(user.interactions[0].createdAt).toEqual(testInteraction.createdAt);
    expect(user.interactions[0].campaign).toEqual(testInteraction.campaign);
    expect(user.interactions[0].body).toEqual(body);
    expect(user.interactions[0].done).toEqual(true);
    expect(user.interactions[0]).toHaveProperty('updatedAt');
  });
});

const createInteractions = interactions => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET interactions = :interactions',
    ExpressionAttributeValues: {
      ':interactions': interactions,
    },
  };

  return ddb.update(params).promise();
};
