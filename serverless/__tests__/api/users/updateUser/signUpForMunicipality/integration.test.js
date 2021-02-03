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

const testMunicipality = {
  ags: randomAgs,
  name: 'Hobbingen',
  population: 5000,
};

let token;

describe('updateUser sign up for munic api test', () => {
  beforeAll(async () => {
    token = await authenticate();
    await createMunicipality(testMunicipality);
  });

  afterAll(async () => {
    await deleteMunicipality(randomAgs);
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
    expect(user.customNewsletters[0].ags).toEqual(randomAgs);
    expect(user.customNewsletters[0].name).toEqual(testMunicipality.name);
    expect(user.customNewsletters[0].extraInfo).toEqual(false);
    expect(user.customNewsletters[0].value).toEqual(true);

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
        ags: randomAgs,
        customNewsletters: [
          {
            name: customMunicipalityName,
            ags: randomAgs,
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
      randomAgs,
      userId
    );

    // Check user
    expect(user.customNewsletters[0].ags).toEqual(randomAgs);
    expect(user.customNewsletters[0].name).toEqual(customMunicipalityName);
    expect(user.customNewsletters[0].extraInfo).toEqual(false);
    expect(user.customNewsletters[0].value).toEqual(true);
    expect(user.customNewsletters[0].timestamp).toEqual(timestamp);

    // Check user municipality table
    expect(municipality.ags).toEqual(randomAgs);
    expect(municipality.userId).toEqual(userId);
    expect(municipality.population).toEqual(testMunicipality.population);
    expect(municipality).toHaveProperty('createdAt');
  });
});
