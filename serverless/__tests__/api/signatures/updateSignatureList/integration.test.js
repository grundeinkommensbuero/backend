const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('updateSignatureList by user api test', () => {
  it('should update signature list', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
      }),
    };

    const listId = '7831715';
    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not find signature list', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        count: 6,
      }),
    };

    const listId = '123456';
    const response = await fetch(`${INVOKE_URL}/signatures/${listId}`, request);

    expect(response.status).toEqual(400);
  });
});
