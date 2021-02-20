const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../../testConfig');
const {
  authenticate,
  createMunicipality,
  deleteUserMunicipalityLink,
  getUserMunicipalityLink,
  deleteMunicipality,
  removeCustomNewsletters,
} = require('../../../../testUtils');
const fetch = require('node-fetch');
const { getUser } = require('../../../../../../utils/shared/users/getUsers');
const crypto = require('crypto-secure-random-digit');

const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const randomAgs = crypto.randomDigits(6).join('');
const anotherRandomAgs = crypto.randomDigits(6).join('');

const testMunicipality = {
  ags: randomAgs,
  name: 'Hobbingen',
  population: 5000,
};

const anotherTestMunicipality = {
  ags: anotherRandomAgs,
  name: 'Eisenhüttenstadt',
  population: 5000,
};

let token;

describe('updateUser sign up for munic api test', () => {
  beforeAll(async () => {
    token = await authenticate();
    await createMunicipality(testMunicipality);
    await createMunicipality(anotherTestMunicipality);
  });

  afterAll(async () => {
    await deleteMunicipality(randomAgs);
    await deleteMunicipality(anotherRandomAgs);
    await deleteUserMunicipalityLink(randomAgs, userId);
    await removeCustomNewsletters(userId);
  });

  it('should be able to sign up for municipality', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        ags: randomAgs,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);
    const { Item: municipality } = await getUserMunicipalityLink(
      randomAgs,
      userId
    );

    // Check user
    const customNewsletter =
      user.customNewsletters[user.customNewsletters.length - 1];
    expect(customNewsletter.ags).toEqual(randomAgs);
    expect(customNewsletter.name).toEqual(testMunicipality.name);
    expect(customNewsletter.extraInfo).toEqual(false);
    expect(customNewsletter.value).toEqual(true);

    // Check user municipality table
    expect(municipality.ags).toEqual(randomAgs);
    expect(municipality.userId).toEqual(userId);
    expect(municipality.population).toEqual(testMunicipality.population);
    expect(municipality).toHaveProperty('createdAt');
  });

  it('should be able to sign up for municipality with newsletter settings as params', async () => {
    const customMunicipalityName = 'blub';
    const timestamp = new Date().toISOString();

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        ags: anotherRandomAgs,
        customNewsletters: [
          {
            name: customMunicipalityName,
            ags: anotherRandomAgs,
            value: true,
            extraInfo: false,
            timestamp,
          },
        ],
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);
    const { Item: municipality } = await getUserMunicipalityLink(
      anotherRandomAgs,
      userId
    );

    // Check user
    const customNewsletter =
      user.customNewsletters[user.customNewsletters.length - 1];
    expect(customNewsletter.ags).toEqual(anotherRandomAgs);
    expect(customNewsletter.name).toEqual(customMunicipalityName);
    expect(customNewsletter.extraInfo).toEqual(false);
    expect(customNewsletter.value).toEqual(true);
    expect(customNewsletter.timestamp).toEqual(timestamp);

    // Check user municipality table
    expect(municipality.ags).toEqual(anotherRandomAgs);
    expect(municipality.userId).toEqual(userId);
    expect(municipality.population).toEqual(anotherTestMunicipality.population);
    expect(municipality).toHaveProperty('createdAt');
  });
});
