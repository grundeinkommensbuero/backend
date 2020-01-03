const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('updateUser api test', () => {
  it('should not be able to update user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        referral: 'test-referral',
      }),
    };

    const userId = 'dd34ebe3-71cd-445b-b651-bd88ebebf459';
    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(401);
  });
});
