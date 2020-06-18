const fetch = require('node-fetch').default;
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const URL = 'https://api.startnext.com/v1.2/projects';

module.exports.handler = async event => {
  try {
    // Check for query params (is null if there is none)
    const projectId =
      event.queryStringParameters && event.queryStringParameters.projectId;

    if (!projectId) {
      return errorResponse(400, 'Project id not provided');
    }

    const params = {
      headers: {
        Authorization: 'Basic MTAwMDAwMDAwMTpub25l',
      },
    };

    // Make call to startnext (or other campaign site) api
    const result = await fetch(`${URL}/${projectId}`, params);

    // parse result to json
    const json = await result.json();

    // return message
    return {
      statusCode: 200,
      headers: responseHeaders,
      isBase64Encoded: false,
      body: JSON.stringify(json),
    };
  } catch (error) {
    console.log('error while getting crowdfunding numbers', error);

    return errorResponse(
      500,
      'Error while getting crowdfunding numbers',
      error
    );
  }
};
