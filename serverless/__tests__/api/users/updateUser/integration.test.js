const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../testConfig');
const { authenticate } = require('../../../testUtils');
const fetch = require('node-fetch');
const AWS = require('aws-sdk');
const { getUser } = require('../../../../../utils/shared/users/getUsers');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

let token;
describe('updateUser update donation api test', () => {
  beforeAll(async () => {
    token = await authenticate();
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
          amount: 50,
          recurring: false,
          firstName: 'Valentin',
          lastName: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
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
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to confirm user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        confirmed: true,
        code: '213232',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
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
    await removeCustomNewsletters();
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

const removeCustomNewsletters = () => {
  const params = {
    TableName: DEV_USERS_TABLE,
    Key: { cognitoId: userId },
    UpdateExpression: 'REMOVE customNewsletters',
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};
