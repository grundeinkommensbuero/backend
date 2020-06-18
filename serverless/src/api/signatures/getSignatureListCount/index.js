const { errorResponse } = require('../../../shared/apiResponse');
const { analyseSignatureLists } = require('./analyseSignatureLists');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async () => {
  try {
    const stats = await analyseSignatureLists();

    return {
      statusCode: 200,
      body: JSON.stringify(stats),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting signature lists count', error);
    return errorResponse(
      500,
      'error while getting signature list count',
      error
    );
  }
};
