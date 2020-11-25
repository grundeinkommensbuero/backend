/**
 * This endpoint is used to get stats for municipalites.
 * One ags (id of municipalities) can be passed via query param.
 */

const { errorResponse } = require('../../../shared/apiResponse');
const {
  getMunicipality,
  getAllMunicipalites,
} = require('../../../shared/municipalities');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // Check for query params (is null if there is none)
    if (event.queryStringParameters && event.queryStringParameters.ags) {
      const ags = event.queryStringParameters.ags;
      const result = await getMunicipality(ags);

      if (!('Item' in result)) {
        // No municipality with the passed ags was added to the database yet
        return {
          statusCode: 200,
          body: JSON.stringify({
            data: { signups: 0, percentToGoal: 0 },
          }),
          headers: responseHeaders,
          isBase64Encoded: false,
        };
      }

      const signUpCount = result.Item.users.length;
      // TODO compute percent to goal
      const percentToGoal = 0;

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: { signups: signUpCount, percentToGoal },
        }),
        headers: responseHeaders,
        isBase64Encoded: false,
      };
    }

    // No query param was passed, therefore we get all municipalities and
    // compute the total number of signups
    const municipalities = await getAllMunicipalites();

    let signUpCount = 0;
    for (const municipality of municipalities) {
      signUpCount += municipality.users.length;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: { signups: signUpCount },
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error getting stats for places', error);
    return errorResponse(500, 'Error while getting stats for places', error);
  }
};
