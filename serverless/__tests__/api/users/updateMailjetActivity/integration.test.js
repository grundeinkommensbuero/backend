const {
  INVOKE_URL_WITHOUT_HTTPS,
  DEV_USERS_TABLE,
  BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const uuid = require('uuid/v4');
const { getUser } = require('../../../../../utils/shared/users/getUsers');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const userId = uuid();
const email = 'emailactivity.test@expedition-grundeinkommen.de';
const ONE_MINUTE = 60 * 1000;

describe('unsubscribeUser api test', () => {
  beforeAll(async () => {
    await createUser();
  });

  afterAll(async () => {
    await deleteUser();
  });

  it('should be able to create activity open', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email,
          event: 'open',
        },
      ]),
    };

    const response = await fetch(
      `https://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@${INVOKE_URL_WITHOUT_HTTPS}/users/email-activity-callback`,
      request
    );

    // Get user to check if unsubscribed correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    console.log({ user });

    expect(response.status).toEqual(200);
    expect(new Date() - new Date(user.emailActivity.lastOpen)).toBeLessThan(
      ONE_MINUTE
    );
  });

  it('should be able to update activity click', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email,
          event: 'click',
        },
      ]),
    };

    const response = await fetch(
      `https://${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}@${INVOKE_URL_WITHOUT_HTTPS}/users/email-activity-callback`,
      request
    );

    // Get user to check if unsubscribed correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(200);
    expect(new Date() - new Date(user.emailActivity.lastClick)).toBeLessThan(
      ONE_MINUTE
    );
  });

  it('should have missing auth', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email: 'valentin@expedition-grundeinkommen.de',
        },
      ]),
    };

    const response = await fetch(
      `https://${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should have wrong auth params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email: 'valentin@expedition-grundeinkommen.de',
        },
      ]),
    };

    const response = await fetch(
      `https://${BASIC_AUTH_USERNAME}:blub@${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(401);
  });
});

const createUser = () => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Item: {
      cognitoId: userId,
      email,
    },
  };
  return ddb.put(params).promise();
};

const deleteUser = () => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: {
      cognitoId: userId, // Username is the id of cognito
    },
  };

  return ddb.delete(params).promise();
};
