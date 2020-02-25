const { INVOKE_URL } = require('../../../../testConfig');
const fetch = require('node-fetch');

describe('get questions api test', () => {
  it('should get most recent questions', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/questions`, request);

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('users');
    expect(json.users[0]).toHaveProperty('questions');
  });

  it('should get most recent questions with number', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/questions?number=20`, request);

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('users');
    expect(json.users[0]).toHaveProperty('questions');
  });
});
