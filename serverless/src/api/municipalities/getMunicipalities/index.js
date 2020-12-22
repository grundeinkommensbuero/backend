/**
 * This endpoint is used as single source of truth to get the data
 * for every municipality in Germany.
 */

const json = require('./places.json');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async () => {
  try {
    // return data
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: json,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error getting places', error);
    return errorResponse(500, 'Error while getting places', error);
  }
};
