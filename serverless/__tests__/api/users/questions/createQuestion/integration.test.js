const { INVOKE_URL } = require('../../../../testConfig');
const fetch = require('node-fetch');
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';

describe('createQuestion api test', () => {
  it('should create question', async () => {
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

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json.question).toEqual(question);
  });

  it('should create question without additional params', async () => {
    const question = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
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

  it('should not find user while creating question', async () => {
    const question = 'Was machst du am Freitag?';

    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ question, name: 'Vali', zipCode: '12051' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/1020132/questions`,
      request
    );

    expect(response.status).toEqual(404);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ name: 'Vali', zipCode: '12051' }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/questions`,
      request
    );

    expect(response.status).toEqual(400);
  });
});
