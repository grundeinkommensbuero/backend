const { INVOKE_URL, DEV_USERS_TABLE } = require('../../../../testConfig');
const { authenticate, removeListFlow } = require('../../../../testUtils');
const fetch = require('node-fetch');
const { getUser } = require('../../../../../../utils/shared/users/getUsers');

const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';

let token;

const listFlow = {
  hasPrinted: true,
};

describe('updateUser list flow', () => {
  beforeAll(async () => {
    token = await authenticate();
    await removeListFlow(userId);
  });

  afterAll(async () => {
    await removeListFlow(userId);
  });

  it('should create new list flow', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        listFlow,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    // Check user
    expect(user.listFlow).toEqual(listFlow);
  });

  it('should update list flow', async () => {
    const newListFlow = {
      hasSent: true,
    };

    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        listFlow: newListFlow,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);

    // Get user and municpality to check if saved correctly
    const { Item: user } = await getUser(DEV_USERS_TABLE, userId);

    // Check user
    expect(user.listFlow.hasPrinted).toEqual(true);
    expect(user.listFlow.hasSent).toEqual(true);
  });
});
