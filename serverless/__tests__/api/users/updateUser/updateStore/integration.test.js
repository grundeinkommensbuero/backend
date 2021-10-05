const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../../testConfig');
const { authenticate, removeStore } = require('../../../../testUtils');
const fetch = require('node-fetch');
const { getUser } = require('../../../../../../utils/shared/users/getUsers');

const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';

let token;

const store = {
  key1: 'value1',
  object1: { arrayInObject: [true, false] },
};

describe('updateUser sign up for munic api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  afterAll(async () => {
    await removeStore(userId);
  });

  it('should create new store', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        store,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    // Check user
    expect(user.store).toEqual(store);
  });

  it('should update store', async () => {
    const newStore = {
      object1: { arrayInObject: [false, false] },
    };

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        store: newStore,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    // Check user
    expect(user.store.key1).toEqual(store.key1);
    expect(user.store.object1).toEqual(newStore.object1);
  });
});
