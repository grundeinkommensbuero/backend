const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const uuid = require('uuid/v4');

describe('request image upload url api test', () => {
  it('should get url for non existing user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        contentType: 'image/jpeg',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/images/upload-url`, request);
    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('uploadUrl');
  });

  it('should not get url for existing user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: userId,
        contentType: 'image/jpeg',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/images/upload-url`, request);

    expect(response.status).toEqual(401);
  });

  it('should have missing content type', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
      }),
    };

    const response = await fetch(`${INVOKE_URL}/images/upload-url`, request);

    expect(response.status).toEqual(400);
  });

  it('should have unsupported content type', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: uuid(),
        contentType: 'image/gif',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/images/upload-url`, request);

    expect(response.status).toEqual(400);
  });
});
