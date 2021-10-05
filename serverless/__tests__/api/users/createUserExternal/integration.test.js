const {
  INVOKE_URL,
  DEV_USERS_TABLE,
  DEV_MUNICIPALITIES_TABLE,
  QUERY_TOKEN,
} = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const crypto = require('crypto-secure-random-digit');
const AWS = require('aws-sdk');
const uuid = require('uuid/v4');

const ddb = new AWS.DynamoDB.DocumentClient({ region: 'eu-central-1' });

const email = 'vali_schagerl@web.de';
const testUserId = '92c1e189-52d0-45cc-adbe-8071696a3221';
const randomAgs = crypto.randomDigits(6).join('');
const { getUser } = require('../../../../../utils/shared/users/getUsers');
const {
  DEV_USER_MUNICIPALITY_TABLE_NAME,
} = require('../../../../../utils/config');

const AGS = '120312';

describe('createUserFromExternal api test', () => {
  beforeAll(async () => {
    await createMunicipality({
      ags: AGS,
      name: 'Eisenhüttenstadt',
      population: 40000,
    });
    await createMunicipality({
      ags: randomAgs,
      name: 'Hobbingen',
      population: 5000,
    });
  });

  afterAll(async () => {
    await deleteMunicipality(AGS);
    await deleteMunicipality(randomAgs);
    await deleteUserMunicipalityLink(randomAgs, testUserId);
  });

  it('should create a new user', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const userToken = uuid();
    const loginToken = uuid();
    const phoneNumber = '004915755940728';

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        username: 'Vali',
        optedIn: true,
        userToken,
        ags: AGS,
        phone: phoneNumber,
        loginToken,
        isEngaged: true,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getUserMunicipalityLink(
      AGS,
      json.data.userId
    );

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.mgeUserToken).toEqual(userToken);
    expect(user.confirmed.value).toEqual(true);
    expect(user.confirmed.optedInAtMge).toEqual(true);
    expect(user.username).toEqual('Vali');
    expect(user.isEngaged).toEqual(true);
    expect(user.customToken.token).toEqual(loginToken);
    expect(user.email).toEqual(randomEmail);
    expect(user.phoneNumber).toEqual(phoneNumber);
    expect(user.customNewsletters[0].ags).toEqual(AGS);
    expect(user.customNewsletters[0].name).toEqual('Eisenhüttenstadt');
    expect(user.customNewsletters[0].extraInfo).toEqual(false);
    expect(user.customNewsletters[0].value).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(AGS);
    expect(municipality.userId).toEqual(json.data.userId);
    expect(municipality).toHaveProperty('createdAt');
    expect(municipality).toHaveProperty('population');
  });

  it('should create a second user without phone and tokens', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        username: 'Vali',
        optedIn: true,
        ags: AGS,
        isEngaged: false,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getUserMunicipalityLink(
      AGS,
      json.data.userId
    );

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.confirmed.value).toEqual(true);
    expect(user.confirmed.optedInAtMge).toEqual(true);
    expect(user.isEngaged).toEqual(false);
    expect(user.username).toEqual('Vali');
    expect(user.email).toEqual(randomEmail);
    expect(typeof user.phoneNumber).toEqual('undefined');
    expect(user.customNewsletters[0].ags).toEqual(AGS);
    expect(user.customNewsletters[0].name).toEqual('Eisenhüttenstadt');
    expect(user.customNewsletters[0].extraInfo).toEqual(false);
    expect(user.customNewsletters[0].value).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(AGS);
    expect(municipality.userId).toEqual(json.data.userId);
    expect(municipality).toHaveProperty('createdAt');
    expect(municipality).toHaveProperty('population');
  });

  it('should create a third user who is not optedIn', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const loginToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        username: 'Vali',
        optedIn: false,
        loginToken,
        ags: AGS,
        isEngaged: false,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getUserMunicipalityLink(
      AGS,
      json.data.userId
    );

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual('Vali');
    expect(user.isEngaged).toEqual(false);
    expect(user.customToken.token).toEqual(loginToken);
    expect(user.email).toEqual(randomEmail);
    expect(typeof user.phoneNumber).toEqual('undefined');

    expect(user.customNewsletters[0].ags).toEqual(AGS);
    expect(user.customNewsletters[0].name).toEqual('Eisenhüttenstadt');
    expect(user.customNewsletters[0].extraInfo).toEqual(false);
    expect(user.customNewsletters[0].value).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(AGS);
    expect(municipality.userId).toEqual(json.data.userId);
    expect(municipality).toHaveProperty('createdAt');
    expect(municipality).toHaveProperty('population');
  });

  it('should work with null values for new user', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: randomEmail,
        username: 'Vali',
        optedIn: false,
        loginToken: null,
        userToken: null,
        phone: null,
        ags: AGS,
        isEngaged: false,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getUserMunicipalityLink(
      AGS,
      json.data.userId
    );

    // Check user
    expect(user.cognitoId).toEqual(json.data.userId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual('Vali');
    expect(user.isEngaged).toEqual(false);
    expect(typeof user.customToken).toEqual('undefined');
    expect(typeof user.mgeUserToken).toEqual('undefined');
    expect(user.email).toEqual(randomEmail);
    expect(typeof user.phoneNumber).toEqual('undefined');

    expect(user.customNewsletters[0].ags).toEqual(AGS);
    expect(user.customNewsletters[0].name).toEqual('Eisenhüttenstadt');
    expect(user.customNewsletters[0].extraInfo).toEqual(false);
    expect(user.customNewsletters[0].value).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(AGS);
    expect(municipality.userId).toEqual(json.data.userId);
    expect(municipality).toHaveProperty('createdAt');
    expect(municipality).toHaveProperty('population');
  });

  it('should add municipality to existing user', async () => {
    const loginToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        username: 'Vali',
        optedIn: true,
        loginToken,
        ags: randomAgs,
        isEngaged: false,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
      request
    );
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('data');
    expect(json.data).toHaveProperty('userId');

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, json.data.userId);
    const { Item: municipality } = await getUserMunicipalityLink(
      randomAgs,
      json.data.userId
    );

    // Check user
    expect(user.isEngaged).toEqual(false);
    expect(user.confirmed.value).toEqual(true);
    expect(typeof user.confirmed.optedInAtMge).toEqual('undefined');
    expect(user.username).toEqual('Vali');
    expect(user.customToken.token).toEqual(loginToken);
    expect(user.email).toEqual(email);
    expect(
      user.customNewsletters[user.customNewsletters.length - 1].ags
    ).toEqual(randomAgs);
    expect(
      user.customNewsletters[user.customNewsletters.length - 1].name
    ).toEqual('Hobbingen');
    expect(
      user.customNewsletters[user.customNewsletters.length - 1].extraInfo
    ).toEqual(false);
    expect(
      user.customNewsletters[user.customNewsletters.length - 1].value
    ).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(randomAgs);
    expect(municipality.userId).toEqual(json.data.userId);
    expect(municipality).toHaveProperty('createdAt');
    expect(municipality).toHaveProperty('population');
  });

  it('should not add municipality to existing user', async () => {
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        username: 'Vali',
        optedIn: true,
        userToken,
        ags: randomAgs,
        isEngaged: true,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
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
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
      request
    );

    expect(response.status).toEqual(400);
  });

  it('should have missing isEngaged', async () => {
    const userToken = uuid();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email,
        username: 'Vali',
        optedIn: true,
        userToken,
        ags: randomAgs,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/external-signup?token=${QUERY_TOKEN}`,
      request
    );

    expect(response.status).toEqual(400);
  });
});

const getUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: DEV_USER_MUNICIPALITY_TABLE_NAME,
    Key: {
      ags,
      userId,
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

const deleteUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: DEV_USER_MUNICIPALITY_TABLE_NAME,
    Key: {
      ags,
      userId,
    },
  };

  return ddb.delete(params).promise();
};
