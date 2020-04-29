const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';

describe('createSurveyAnswer api test', () => {
  it('should be able to update user', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        answerId: 1,
        answer: 'answer-1',
        surveyCode: 'survey-1',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/surveys`,
      request
    );

    expect(response.status).toEqual(201);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        answerId: 1,
        answer: 'answer-1',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/surveys`,
      request
    );

    expect(response.status).toEqual(400);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({}),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/surveys`,
      request
    );

    expect(response.status).toEqual(400);
  });
});
