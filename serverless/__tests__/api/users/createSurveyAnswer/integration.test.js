const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');

const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';

describe('createSurveyAnswer api test', () => {
  it('should be able to create survey answer', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        answer: 'answer-1',
        surveyCode: `${randomWords()}-1`,
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/surveys`,
      request
    );

    expect(response.status).toEqual(201);
  });

  it('should not be able to create survey answer for same surveys', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        answer: 'answer-1',
        surveyCode: 'survey-1',
      }),
    };

    const response = await fetch(
      `${INVOKE_URL}/users/${userId}/surveys`,
      request
    );

    expect(response.status).toEqual(401);
  });

  it('should have missing params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
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
