const {
  INVOKE_URL,
  DEV_USERS_TABLE,
  DEV_MUNICIPALITIES_TABLE,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const crypto = require('crypto-secure-random-digit');
const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const email = 'vali_schagerl@web.de';
const randomAgs = crypto.randomDigits(6).join('');
const { token } = require('../../../../queryToken');
const { getUser } = require('../../../../../utils/shared/users/getUsers');

const AGS = '120312';

describe('createUserFromExternal api test', () => {
  beforeAll(async () => {
    await createMunicipality({ ags: AGS, name: 'Eisenhüttenstadt' });
    await createMunicipality({ ags: randomAgs, name: 'Hobbingen' });
  });

  afterAll(async () => {
    await deleteMunicipality(AGS);
    await deleteMunicipality(randomAgs);
  });

  it('should create a new user', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const signupId = '23123';
    const userToken = uuid();
    const phoneNumber = '004915755940728';

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        signupId,
        username: 'Vali',
        optedIn: true,
        userToken,
        ags: AGS,
        phone: phoneNumber,
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
    const { Item: municipality } = await getMunicipality(AGS);

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.mgeSignupId).toEqual(signupId);
    expect(user.confirmed.value).toEqual(true);
    expect(user.confirmed.optedInAtMge).toEqual(true);
    expect(user.username).toEqual('Vali');
    expect(user.customToken.token).toEqual(userToken);
    expect(user.email).toEqual(randomEmail);
    expect(user.phoneNumber).toEqual(phoneNumber);

    expect(user.municipalCampaigns.length).toEqual(1);
    expect(user.municipalCampaigns[0].ags).toEqual(AGS);
    expect(user.municipalCampaigns[0]).toHaveProperty('createdAt');

    // Check municipality
    const userInMunicipality = municipality.users[0];

    expect(municipality.users.length).toEqual(1);
    expect(municipality.ags).toEqual(AGS);
    expect(userInMunicipality.id).toEqual(json.data.userId);
    expect(userInMunicipality).toHaveProperty('createdAt');
  });

  it('should create a second user without phone', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const signupId = '23123';
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        signupId,
        username: 'Vali',
        optedIn: true,
        userToken,
        ags: AGS,
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
    const { Item: municipality } = await getMunicipality(AGS);

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.mgeSignupId).toEqual(signupId);
    expect(user.confirmed.value).toEqual(true);
    expect(user.confirmed.optedInAtMge).toEqual(true);
    expect(user.username).toEqual('Vali');
    expect(user.customToken.token).toEqual(userToken);
    expect(user.email).toEqual(randomEmail);
    expect(typeof user.phoneNumber).toEqual('undefined');

    expect(user.municipalCampaigns.length).toEqual(1);
    expect(user.municipalCampaigns[0].ags).toEqual(AGS);
    expect(user.municipalCampaigns[0]).toHaveProperty('createdAt');

    // Check municipality
    const userInMunicipality =
      municipality.users[municipality.users.length - 1];

    expect(municipality.users.length).toEqual(2);
    expect(municipality.ags).toEqual(AGS);
    expect(userInMunicipality.id).toEqual(json.data.userId);
    expect(userInMunicipality).toHaveProperty('createdAt');
  });

  it('should create a third user who is not optedIn', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const signupId = '23123';
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        signupId,
        username: 'Vali',
        optedIn: false,
        userToken,
        ags: AGS,
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
    const { Item: municipality } = await getMunicipality(AGS);

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.mgeSignupId).toEqual(signupId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual('Vali');
    expect(user.customToken.token).toEqual(userToken);
    expect(user.email).toEqual(randomEmail);
    expect(typeof user.phoneNumber).toEqual('undefined');

    expect(user.municipalCampaigns.length).toEqual(1);
    expect(user.municipalCampaigns[0].ags).toEqual(AGS);
    expect(user.municipalCampaigns[0]).toHaveProperty('createdAt');

    // Check municipality
    const userInMunicipality =
      municipality.users[municipality.users.length - 1];

    expect(municipality.users.length).toEqual(3);
    expect(municipality.ags).toEqual(AGS);
    expect(userInMunicipality.id).toEqual(json.data.userId);
    expect(userInMunicipality).toHaveProperty('createdAt');
  });

  it('should add municipality to existing user', async () => {
    const signupId = '23123';
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        signupId,
        username: 'Vali',
        optedIn: true,
        userToken,
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
    expect(user.mgeSignupId).toEqual(signupId);
    expect(user.confirmed.value).toEqual(true);
    expect(typeof user.confirmed.optedInAtMge).toEqual('undefined');
    expect(user.username).toEqual('Vali');
    expect(user.customToken.token).toEqual(userToken);
    expect(user.email).toEqual(email);

    const municipalityInUser =
      user.municipalCampaigns[user.municipalCampaigns.length - 1];

    expect(municipalityInUser.ags).toEqual(randomAgs);
    expect(municipalityInUser).toHaveProperty('createdAt');

    // Check municipality
    const userInMunicipality = municipality.users[0];

    expect(municipality.users.length).toEqual(1);
    expect(municipality.ags).toEqual(randomAgs);
    expect(userInMunicipality.id).toEqual(json.data.userId);
    expect(userInMunicipality).toHaveProperty('createdAt');
  });

  it('should not add municipality to existing user', async () => {
    const signupId = '23123';
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        signupId,
        username: 'Vali',
        optedIn: true,
        userToken,
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
    const signupId = '23123';
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        signupId,
        username: 'Vali',
        optedIn: true,
        userToken,
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
    const signupId = '23123';
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        signupId,
        username: 'Vali',
        optedIn: true,
        userToken,
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
    const signupId = '23123';
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        signupId,
        username: 'Vali',
        optedIn: true,
        userToken,
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

const createMunicipality = municipality => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Item: municipality,
  };

  return ddb.put(params).promise();
};

const deleteMunicipality = ags => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE,
    Key: {
      ags,
    },
  };

  return ddb.delete(params).promise();
};
