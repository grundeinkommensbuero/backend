const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');
const uuid = require('uuid/v4');
const crypto = require('crypto-secure-random-digit');

const USER_ID = '92c1e189-52d0-45cc-adbe-8071696a3221';
const randomAgs = crypto.randomDigits(6).join('');
const randomUserId = uuid();
const anotherRandomUserId = uuid();

const { getUser } = require('../../../../../utils/shared/users/getUsers');
const {
  createMunicipality,
  deleteMunicipality,
  deleteUserMunicipalityLink,
  getUserMunicipalityLink,
} = require('../../../testUtils');

const testMunicipality = {
  ags: randomAgs,
  name: 'Hobbingen',
  population: 5000,
};

describe('createUser api test', () => {
  beforeAll(async () => {
    await createMunicipality(testMunicipality);
  });

  afterAll(async () => {
    await deleteMunicipality(randomAgs);
    await deleteUserMunicipalityLink(randomAgs, randomUserId);
    await deleteUserMunicipalityLink(randomAgs, anotherRandomUserId);
  });

  it('should create a new user with newsletter consent', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user with phone number', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        phoneNumber: '004964423893023',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user with newsletter consent and source', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        source: 'test-source',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);
  });

  it('should create a new user with wantsToCollect in general ', async () => {
    const userData = {
      userId: uuid(),
      email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
      newsletterConsent: true,
      zipCode: '12051',
      username: 'Vali',
      wantsToCollect: { inGeneral: true },
    };

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(userData),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userData.userId);

    expect(response.status).toEqual(201);
    expect(user.cognitoId).toEqual(userData.userId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual(userData.username);
    expect(user.email).toEqual(userData.email);
    expect(user.zipCode).toEqual(userData.zipCode);
    expect(user.newsletterConsent.value).toEqual(userData.newsletterConsent);
    expect(user.wantsToCollect.inGeneral).toEqual(
      userData.wantsToCollect.inGeneral
    );
  });

  it('should create a new user with wantsToCollect at meetup', async () => {
    const userData = {
      userId: uuid(),
      email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
      newsletterConsent: true,
      zipCode: '12051',
      username: 'Vali',
      wantsToCollect: {
        meetup: { location: 'Tempelhofer Feld', date: '2022-06-01' },
      },
    };

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(userData),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userData.userId);

    expect(response.status).toEqual(201);
    expect(user.cognitoId).toEqual(userData.userId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual(userData.username);
    expect(user.email).toEqual(userData.email);
    expect(user.zipCode).toEqual(userData.zipCode);
    expect(user.newsletterConsent.value).toEqual(userData.newsletterConsent);
    expect(user.wantsToCollect.inGeneral).toEqual(
      userData.wantsToCollect.inGeneral
    );
    expect(user.wantsToCollect.meetups[0].location).toEqual(
      userData.wantsToCollect.meetup.location
    );
    expect(user.wantsToCollect.meetups[0].date).toEqual(
      userData.wantsToCollect.meetup.date
    );
    expect(user.wantsToCollect.meetups[0]).toHaveProperty('timestamp');
  });

  it('should create a new user with wantsToCollect at meetup and in general', async () => {
    const userData = {
      userId: uuid(),
      email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
      newsletterConsent: true,
      zipCode: '12051',
      username: 'Vali',
      wantsToCollect: {
        inGeneral: true,
        meetup: { location: 'Tempelhofer Feld', date: '2022-06-01' },
        question: 'blub',
      },
    };

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(userData),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    // Get user to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userData.userId);

    expect(response.status).toEqual(201);
    expect(user.cognitoId).toEqual(userData.userId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual(userData.username);
    expect(user.email).toEqual(userData.email);
    expect(user.zipCode).toEqual(userData.zipCode);
    expect(user.newsletterConsent.value).toEqual(userData.newsletterConsent);

    expect(user.wantsToCollect.inGeneral).toEqual(
      userData.wantsToCollect.inGeneral
    );
    expect(user.wantsToCollect.question).toEqual(
      userData.wantsToCollect.question
    );
    expect(user.wantsToCollect.meetups[0].location).toEqual(
      userData.wantsToCollect.meetup.location
    );
    expect(user.wantsToCollect.meetups[0].date).toEqual(
      userData.wantsToCollect.meetup.date
    );
    expect(user.wantsToCollect.meetups[0]).toHaveProperty('timestamp');
  });

  it('should create a new user for municipality', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        ags: randomAgs,
        userId: randomUserId,
        email: randomEmail,
        extraInfo: true,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        source: 'test-source',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, randomUserId);
    const { Item: municipality } = await getUserMunicipalityLink(
      randomAgs,
      randomUserId
    );

    // Check user
    expect(user.cognitoId).toEqual(randomUserId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual('Vali');
    expect(user.email).toEqual(randomEmail);
    expect(user.customNewsletters[0].ags).toEqual(randomAgs);
    expect(user.customNewsletters[0].name).toEqual(testMunicipality.name);
    expect(user.customNewsletters[0].extraInfo).toEqual(true);
    expect(user.customNewsletters[0].value).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(randomAgs);
    expect(municipality.userId).toEqual(randomUserId);
    expect(municipality.population).toEqual(testMunicipality.population);
    expect(municipality).toHaveProperty('createdAt');
  });

  it('should create a new user for municipality with custom newsletters in params', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const customMunicipalityName = 'blub';
    const timestamp = new Date().toISOString();

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        ags: randomAgs,
        userId: anotherRandomUserId,
        email: randomEmail,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        source: 'test-source',
        customNewsletters: [
          {
            name: customMunicipalityName,
            ags: randomAgs,
            value: true,
            extraInfo: true,
            timestamp,
          },
        ],
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(201);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, anotherRandomUserId);
    const { Item: municipality } = await getUserMunicipalityLink(
      randomAgs,
      anotherRandomUserId
    );

    // Check user
    expect(user.cognitoId).toEqual(anotherRandomUserId);
    expect(user.confirmed.value).toEqual(false);
    expect(user.username).toEqual('Vali');
    expect(user.email).toEqual(randomEmail);
    expect(user.customNewsletters[0].ags).toEqual(randomAgs);
    expect(user.customNewsletters[0].name).toEqual(customMunicipalityName);
    expect(user.customNewsletters[0].extraInfo).toEqual(true);
    expect(user.customNewsletters[0].value).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(randomAgs);
    expect(municipality.userId).toEqual(anotherRandomUserId);
    expect(municipality).toHaveProperty('createdAt');
    expect(municipality).toHaveProperty('population');
  });

  it('should not be authorized to overwrite user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: USER_ID,
        email: 'vali_schagerl@web.de',
        referral: 'test-referral',
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(401);
  });

  it('should have missing email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing user id', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have wrong email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have wrong phone number', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        phoneNumber: '0151a7953677',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have wrong zip code', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '2074',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should have missing newsletter consent', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        email: `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`,
        referral: 'test-referral',
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(400);
  });

  it('should not find municipality', async () => {
    const randomEmail = `${randomWords()}.${randomWords()}@expedition-grundeinkommen.de`;
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        ags: '2131231',
        userId: randomUserId,
        email: randomEmail,
        referral: 'test-referral',
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
        source: 'test-source',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users`, request);

    expect(response.status).toEqual(401);
  });
});
