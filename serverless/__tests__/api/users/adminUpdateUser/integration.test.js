const { DEV_USERS_TABLE, INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const uuid = require('uuid/v4');
const { getUser } = require('../../../../../utils/shared/users/getUsers');
const { authenticateAdmin } = require('../../../testUtils');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));

const userId = uuid();
const email = 'adminupdate.test@expedition-grundeinkommen.de';

let token;

describe('adminUpdateUser api test', () => {
  beforeAll(async () => {
    token = await authenticateAdmin();
    await createUser();
  });

  afterAll(async () => {
    await deleteUser();
  });

  it('should be able to unsubscribe user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ newsletterConsent: false }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users/${userId}`,
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

    expect(response.status).toEqual(204);
    expect(user.newsletterConsent.value).toEqual(false);
    expect(user.reminderMails.value).toEqual(false);
    expect(allFalse).toEqual(true);
  });

  it('should be able to cancel donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ donation: { cancel: true } }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users/${userId}`,
      request
    );

    // Get user to check if unsubscribed correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);
    expect(user.donations.recurringDonation).toHaveProperty('cancelledAt');
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({ newsletterConsent: false }),
    };

    const response = await fetch(
      `${INVOKE_URL}/admin/users/${userId}`,
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
      donations: {
        recurringDonation: {
          iban: '123192312',
          createdAt: timestamp,
          firstDebitDate: timestamp,
          id: '1231231',
        },
      },
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
  return ddb.put(params);
};

const deleteUser = () => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: {
      cognitoId: userId, // Username is the id of cognito
    },
  };

  return ddb.delete(params);
};
