const { INVOKE_URL } = require('../../../testConfig');
const { authenticate } = require('../../../testUtils');
const fetch = require('node-fetch');

const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

let token;

describe('createSignatureList api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should create a new anonymous signature list for sh', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
    console.log(json);
  });

  it('should create a new anonymous signature list for ber', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        campaignCode: 'berlin-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should create a new anonymous signature list for bb', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        campaignCode: 'brandenburg-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should create a new anonymous signature list for dibb', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        campaignCode: 'dibb-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should create a new anonymous signature list for hb', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        campaignCode: 'bremen-1',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should create a new signature list via userId triggered by admin', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId,
        campaignCode: 'brandenburg-1',
        triggeredByAdmin: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/signatures`, request);
    const json = await response.json();

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should create a new signature list via authenticated route', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/signatures`,
      request
    );
    const json = await response.json();

    console.log(json);

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should create a new signature list for dibb via authenticated route', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        campaignCode: 'dibb-1',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/signatures`,
      request
    );
    const json = await response.json();

    console.log(json);

    expect(response.status).toBeLessThan(202);
    expect(json).toHaveProperty('signatureList');
  });

  it('should be unauthorized to create list via authenticated route for other user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${otherUserId}/signatures`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should be unauthorized to create list via authenticated route', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        campaignCode: 'schleswig-holstein-1',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/signatures`,
      request
    );

    expect(response.status).toEqual(401);
  });
});
