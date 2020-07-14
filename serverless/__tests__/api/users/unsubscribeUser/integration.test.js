const { INVOKE_URL_WITHOUT_HTTPS } = require('../../../testConfig');
const { username, password } = require('../../../../basicAuth');
const fetch = require('node-fetch');

describe('unsubscribeUser api test', () => {
  it('should be able to unsubscribe user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email: 'valentin@expedition-grundeinkommen.de',
        },
      ]),
    };

    const response = await fetch(
      `https://${username}:${password}@${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(200);
  });

  it('should not find email', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email: 'valentin@dition-grundeinkommen.de',
        },
      ]),
    };

    const response = await fetch(
      `https://${username}:${password}@${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(200);
  });

  it('should have missing auth', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email: 'valentin@expedition-grundeinkommen.de',
        },
      ]),
    };

    const response = await fetch(
      `https://${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should have wrong auth params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify([
        {
          email: 'valentin@expedition-grundeinkommen.de',
        },
      ]),
    };

    const response = await fetch(
      `https://${username}:blub@${INVOKE_URL_WITHOUT_HTTPS}/users/unsubscribe-callback`,
      request
    );

    expect(response.status).toEqual(401);
  });
});
