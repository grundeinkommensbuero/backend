const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');
const randomWords = require('random-words');

const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';

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

  it('should be able to create survey answer for same surveys', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        answer: 'answer-2',
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
