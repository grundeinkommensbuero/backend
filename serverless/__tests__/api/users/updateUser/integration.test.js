const { INVOKE_URL } = require('../../../testConfig');
const { authenticate } = require('../../../testUtils');
const fetch = require('node-fetch');

const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

let token;

describe('updateUser api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should be able to update user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
        zipCode: '12051',
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstname: 'Valentin',
          lastname: 'Schagerl',
          iban: 'DE26641500200001294334',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstname: 'Valentin',
          lastname: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          firstname: 'Valentin',
          lastname: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: '50',
          recurring: false,
          firstname: 'Valentin',
          lastname: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: 'blub',
          firstname: 'Valentin',
          lastname: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          lastname: 'Schagerl',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstname: 'Valentin',
          iban: 'DE26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to update donation', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstname: 'Valentin',
          lastname: 'Schagerl',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not have valid iban', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstname: 'Valentin',
          lastname: 'Schagerl',
          iban: '12312931',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not have valid iban', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        donation: {
          amount: 50,
          recurring: false,
          firstname: 'Valentin',
          lastname: 'Schagerl',
          iban: 'DX26 6415 0020 0001 2943 34',
        },
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should be able to update user with one missing param', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
        username: 'Vali',
        city: 'Berlin',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update only newsletter consent', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update only username', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        username: 'Vali',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update only zip code', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        zipCode: '12051',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should be able to update user from bb platform', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({
        updatedOnXbge: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(204);
  });

  it('should not be able to change other user', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },

      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${otherUserId}`, request);

    expect(response.status).toEqual(401);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({}),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(400);
  });

  it('should not be able to authorize', async () => {
    const request = {
      method: 'PATCH',
      mode: 'cors',
      body: JSON.stringify({
        newsletterConsent: true,
      }),
    };

    const response = await fetch(`${INVOKE_URL}/users/${userId}`, request);

    expect(response.status).toEqual(401);
  });
});
