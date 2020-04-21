const { INVOKE_URL } = require('../../../../testConfig');
const { authenticate } = require('../../../../testUtils');
const fetch = require('node-fetch');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';
const otherUserId = '7f7dec33-177d-4177-b4a9-b9de7c5e9b55';

let token;

describe('createQuestion api test', () => {
  beforeAll(async () => {
    token = await authenticate();
  });

  it('should create question', async () => {
    const question = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ question, name: 'Vali', zipCode: '12051' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/questions`,
      request
    );

    const json = await response.json();
    console.log('json', json);

    expect(response.status).toEqual(201);
    expect(json.question).toEqual(question);
  });

  it('should create question without additional params', async () => {
    const question = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ question }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/questions`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json.question).toEqual(question);
  });

  it('should have missing token', async () => {
    const question = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ question, name: 'Vali', zipCode: '12051' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/questions`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should not be authorized to create question for other user', async () => {
    const question = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ question, name: 'Vali', zipCode: '12051' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${otherUserId}/questions`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      headers: {
        Authorization: token,
      },
      body: JSON.stringify({ name: 'Vali', zipCode: '12051' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/questions`,
      request
    );

    expect(response.status).toEqual(400);
  });
});
