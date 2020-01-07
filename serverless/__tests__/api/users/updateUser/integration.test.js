const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const userId = '64d87c55-4caa-4733-b689-7f1bd3defd0f';

describe('updateUser api test', () => {
  it('should not be able to update user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        referral: 'test-referral',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(401);
  });
});
