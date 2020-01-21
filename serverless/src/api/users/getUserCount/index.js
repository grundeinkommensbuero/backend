const { errorResponse } = require('../../../shared/apiResponse');
const { analyseUsers } = require('./analyseUsers');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    const stats = await analyseUsers();

    return {
      statusCode: 200,
      body: JSON.stringify(stats),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting user count', error);
    return errorResponse(500, 'error while getting user count', error);
  }
};
