const {
  INVOKE_URL_WITHOUT_HTTPS,
  DEV_USERS_TABLE,
} = require('../../../testConfig');
const { username, password } = require('../../../../basicAuth');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const uuid = require('uuid/v4');
const { getUser } = require('../../../../../utils/shared/users/getUsers');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const userId = uuid();
const email = 'unsubscribe.test@expedition-grundeinkommen.de';

describe('unsubscribeUser api test', () => {
  beforeAll(async () => {
    await createUser();
  });

  afterAll(async () => {
    await deleteUser();
  });

  it('should be able to unsubscribe user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email,
        },
      ]),
    };

    const response = await fetch(
      `https://${username}:${password}@${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    // Get user to check if unsubscribed correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    let allFalse = true;
    for (const newsletter of user.customNewsletters) {
      if (newsletter.value) {
        allFalse = false;
      }
    }

    expect(response.status).toEqual(200);
    expect(user.newsletterConsent.value).toEqual(false);
    expect(allFalse).toEqual(true);
  });

  it('should not find email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email: 'valentin@dition-grundeinkommen.de',
        },
      ]),
    };

    const response = await fetch(
      `https://${username}:${password}@${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(200);
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
      `https://${username}:blub@${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(401);
  });
});

const createUser = () => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: DEV_USERS_TABLE,
    Item: {
      cognitoId: userId,
      email,
      newsletterConsent: {
        value: true,
        timestamp,
      },
      customNewsletters: [
        {
          extraInfo: true,
          value: true,
          name: 'Blub1',
        },
        {
          extraInfo: false,
          value: true,
          name: 'Blub2',
        },
        {
          extraInfo: false,
          value: false,
          name: 'Blub3',
        },
      ],
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
