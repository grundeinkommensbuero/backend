const {
  INVOKE_URL,
  DEV_USERS_TABLE,
  DEV_MUNICIPALITIES_TABLE,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const crypto = require('crypto-secure-random-digit');
const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const email = 'vali_schagerl@web.de';
const randomAgs = crypto.randomDigits(6).join('');
const { token } = require('../../../../queryToken');
const { getUser } = require('../../../../../utils/shared/users/getUsers');

describe('createUserFromExternal api test', () => {
  it('should create a new user with existing municipality', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const ags = '120312';

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        firstName: 'Valentin',
        lastName: 'Schagerl',
        ags,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${token}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getMunicipality(ags);

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.firstName).toEqual('Valentin');
    expect(user.lastName).toEqual('Schagerl');
    expect(user.username).toEqual('Vali');
    expect(user.zipCode).toEqual('12051');
    expect(user.city).toEqual('Berlin');
    expect(user.email).toEqual(randomEmail);
    expect(user.municipalCampaigns.length).toEqual(1);
    expect(user.municipalCampaigns[0].ags).toEqual(ags);
    expect(user.municipalCampaigns[0]).toHaveProperty('createdAt');

    // Check municipality
    const userInMunicipality =
      municipality.users[municipality.users.length - 1];

    expect(municipality.ags).toEqual(ags);
    expect(userInMunicipality.id).toEqual(json.data.userId);
    expect(userInMunicipality).toHaveProperty('createdAt');
  });

  it('should create a new user with new municipality', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const ags = crypto.randomDigits(6).join('');

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        firstName: 'Valentin',
        lastName: 'Schagerl',
        ags,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${token}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getMunicipality(ags);

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.firstName).toEqual('Valentin');
    expect(user.lastName).toEqual('Schagerl');
    expect(user.username).toEqual('Vali');
    expect(user.zipCode).toEqual('12051');
    expect(user.city).toEqual('Berlin');
    expect(user.email).toEqual(randomEmail);
    expect(user.municipalCampaigns.length).toEqual(1);
    expect(user.municipalCampaigns[0].ags).toEqual(ags);
    expect(user.municipalCampaigns[0]).toHaveProperty('createdAt');

    // Check municipality
    expect(municipality.ags).toEqual(ags);
    expect(municipality.users.length).toEqual(1);
    expect(municipality.users[0].id).toEqual(json.data.userId);
    expect(municipality.users[0]).toHaveProperty('createdAt');
  });

  it('should add municipality to existing user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        firstName: 'Valentin',
        lastName: 'Schagerl',
        ags: randomAgs,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${token}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getMunicipality(randomAgs);

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.firstName).toEqual('Valentin');
    expect(user.lastName).toEqual('Schagerl');
    expect(user.username).toEqual('Vali');
    expect(user.zipCode).toEqual('12051');
    expect(user.city).toEqual('Berlin');
    expect(user.email).toEqual(email);

    const municipalityInUser =
      user.municipalCampaigns[user.municipalCampaigns.length - 1];

    expect(municipalityInUser.ags).toEqual(randomAgs);
    expect(municipalityInUser).toHaveProperty('createdAt');

    // Check municipality
    const userInMunicipality =
      municipality.users[municipality.users.length - 1];

    expect(municipality.ags).toEqual(randomAgs);
    expect(userInMunicipality.id).toEqual(json.data.userId);
    expect(userInMunicipality).toHaveProperty('createdAt');
  });

  it('should not add existing municipality to existing user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        firstName: 'Valentin',
        lastName: 'Schagerl',
        ags: randomAgs,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${token}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');
  });

  it('should have missing query token', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        firstName: 'Valentin',
        lastName: 'Schagerl',
        ags: randomAgs,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should have wrong query token', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        firstName: 'Valentin',
        lastName: 'Schagerl',
        ags: randomAgs,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=123129312319`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should have missing email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        firstName: 'Valentin',
        lastName: 'Schagerl',
        ags: randomAgs,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${token}`,
      request
    );

    expect(response.status).toEqual(400);
  });
});

const getMunicipality = ags => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Key: {
      ags,
    },
  };

  return ddb.get(params).promise();
};
