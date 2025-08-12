const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../../testConfig');
const {
  authenticate,
  removeCustomNewsletters,
} = require('../../../../testUtils');
const fetch = require('node-fetch');
const { getUser } = require('../../../../../../utils/shared/users/getUsers');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const uuid = require('uuid/v4');
const crypto = require('crypto-secure-random-digit');

const ddb = DynamoDBDocument.from(new DynamoDB({ region: 'eu-central-1' }));

const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

let token;
describe('updateUser update donation api test', () => {
  beforeAll(async () => {
    token = await authenticate();

    const params = {
      TableName: DEV_USERS_TABLE,
      Key: { cognitoId: userId },
      UpdateExpression: 'REMOVE donations',
      ReturnValues: 'UPDATED_NEW',
    };

    await ddb.update(params);
  });

  it('should be able to create recurring donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: true,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DE26641500200001294334',
          yearly: true,
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update recurring donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: true,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DE26641500200001294334',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to create one time donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50.5,
          recurring: false,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
          certificateReceiver: 'Anna',
          certificateGiver: 'Björn',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to cancel recurring donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          cancel: true,
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);

    expect(user.donations.recurringDonation).toHaveProperty('cancelledAt');
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: '50',
          recurring: false,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: 'blub',
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          lastName: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstName: 'Valentin',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstName: 'Valentin',
          lastName: 'Schagerl',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not have valid iban', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: '12312931',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not have valid iban', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DX26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });
});

describe('updateUser api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should be able to update user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
        reminderMails: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to confirm user and remove token', async () => {
    await addCustomToken();

    const code = '213232';
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        confirmed: true,
        code,
        removeToken: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);

    expect(user.confirmed.value).toEqual(true);
    expect(user.confirmed.code).toEqual(code);
    expect(user.confirmed).toHaveProperty('ipAddress');
    expect(user.confirmed).toHaveProperty('timestamp');

    expect(typeof user.customToken).toEqual('undefined');
  });

  it('should be able to remove token', async () => {
    await addCustomToken();

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        removeToken: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);

    expect(typeof user.customToken).toEqual('undefined');
  });

  it('should be able to update user with one missing param', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update only newsletter consent', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update only username', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        username: 'Vali',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update user with phone number', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        phoneNumber: '004964423893023',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update only zip code', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        zipCode: '12051',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update user from bb platform', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        updatedOnXbge: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not be able to change other user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },

      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${otherUserId}`, request);

    expect(response.status).toEqual(401);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({}),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should have incorrect phone number', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        phoneNumber: '00496a423893023',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(401);
  });
});

describe('updateUser update newsletters test', () => {
  beforeAll(async () => {
    // Remove custom newsletters key from user
    await removeCustomNewsletters(userId);
  });

  afterAll(async () => {
    // Remove custom newsletters key from user
    await removeCustomNewsletters(userId);
  });

  it('should set custom newsletters', async () => {
    const timestamp = new Date().toISOString();

    const customNewsletters = [
      {
        name: 'Kiel',
        ags: '1231231',
        value: true,
        extraInfo: false,
        timestamp,
      },
      {
        name: 'Stuttgart',
        ags: '123431',
        value: true,
        extraInfo: true,
        timestamp,
      },
    ];

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        customNewsletters,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);
    expect(user.customNewsletters).toEqual(customNewsletters);
  });

  it('should update custom newsletters', async () => {
    const timestamp = new Date().toISOString();

    const customNewsletters = [
      {
        name: 'Kiel',
        ags: '1231231',
        value: true,
        extraInfo: false,
        timestamp,
      },
      {
        name: 'Mainz',
        ags: '123431',
        value: true,
        extraInfo: true,
        timestamp,
      },
    ];

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        customNewsletters,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);
    expect(user.customNewsletters).toEqual(customNewsletters);
  });

  it('should have missing params', async () => {
    const timestamp = new Date().toISOString();

    const customNewsletters = [
      {
        name: 'Kiel',
        ags: '1231231',
        extraInfo: false,
        timestamp,
      },
      {
        name: 'Mainz',
        ags: '123431',
        value: true,
        extraInfo: true,
        timestamp,
      },
    ];

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        customNewsletters,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params', async () => {
    const timestamp = new Date().toISOString();

    const customNewsletters = [
      {
        ags: '1231231',
        value: true,
        extraInfo: false,
        timestamp,
      },
      {
        name: 'Mainz',
        ags: '123431',
        value: true,
        extraInfo: true,
        timestamp,
      },
    ];

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        customNewsletters,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing params', async () => {
    const timestamp = new Date().toISOString();

    const customNewsletters = [
      {
        name: 'Kiel',
        ags: '1231231',
        value: true,
        timestamp,
      },
      {
        name: 'Mainz',
        ags: '123431',
        value: true,
        extraInfo: true,
        timestamp,
      },
    ];

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        customNewsletters,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });
});

describe('updateUser update wantsToCollect', () => {
  beforeAll(async () => {
    token = await authenticate();

    const params = {
      TableName: DEV_USERS_TABLE,
      Key: { cognitoId: userId },
      UpdateExpression: 'REMOVE wantsToCollect',
      ReturnValues: 'UPDATED_NEW',
    };

    await ddb.update(params);
  });

  it('should set wants to collect with question', async () => {
    const wantsToCollect = { inGeneral: true, question: 'blub' };

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        wantsToCollect,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);
    expect(user.wantsToCollect).toHaveProperty('createdAt');
    expect(user.wantsToCollect.inGeneral).toEqual(true);
    expect(user.wantsToCollect.question).toEqual(wantsToCollect.question);
  });

  it('should update wantsToCollect', async () => {
    const wantsToCollect = {
      meetup: { location: 'Tempelhofer Feld', date: '2022-06-01' },
    };

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        wantsToCollect,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);
    expect(user.wantsToCollect).toHaveProperty('updatedAt');
    expect(user.wantsToCollect.meetups[0]).toHaveProperty('timestamp');
    expect(user.wantsToCollect.meetups[0].date).toEqual(
      wantsToCollect.meetup.date
    );
    expect(user.wantsToCollect.meetups[0].location).toEqual(
      wantsToCollect.meetup.location
    );
  });

  it('should update wantsToCollect and something else', async () => {
    const wantsToCollect = {
      meetup: { location: 'Tempelhofer Feld', date: '2022-06-10' },
    };

    const username = 'Wall-E';

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        wantsToCollect,
        username,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    expect(response.status).toEqual(204);
    expect(user.wantsToCollect).toHaveProperty('updatedAt');
    expect(user.wantsToCollect.meetups[1]).toHaveProperty('timestamp');
    expect(user.wantsToCollect.meetups[1].date).toEqual(
      wantsToCollect.meetup.date
    );
    expect(user.wantsToCollect.meetups[0].location).toEqual(
      wantsToCollect.meetup.location
    );
    expect(user.username).toEqual(username);
  });

  it('should have missing param', async () => {
    const wantsToCollect = {
      meetup: { location: 'Tempelhofer Feld' },
    };

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        wantsToCollect,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing param', async () => {
    const wantsToCollect = {
      meetup: { date: '2022-06-10' },
    };

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        wantsToCollect,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing param', async () => {
    const wantsToCollect = {
      blub: 'blub',
    };

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        wantsToCollect,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });
});

const addCustomToken = () => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET customToken = :token',
    ExpressionAttributeValues: {
      ':token': { customToken: uuid(), timestamp: new Date().toISOString() },
    },
  };

  return ddb.update(params);
};
