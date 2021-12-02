/**
 * This endpoint is used to get stats for municipalities.
 * */

const { errorResponse } = require('../../../shared/apiResponse');
const {
  timePassed,
} = require('../../../triggers/municipalities/createMunicipalitiesStats');
const { getStatsJson } = require('../../../shared/municipalities');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const scale = [
  // Note: currently optimized for
  // mockup-data and circles as markers
  [1, 40000],
  [1000, 30000],
];

module.exports.handler = async event => {
  try {
    let shouldSendAllMunicipalities;

    // Check for query params (is null if there is none)
    if (event.queryStringParameters) {
      shouldSendAllMunicipalities = !!event.queryStringParameters.all;
    }

    // Depending on the query params we get a different json file
    const json = await getStatsJson(
      shouldSendAllMunicipalities ? 'statsWithAll.json' : 'statsWithEvents.json'
    );

    const body = JSON.parse(json.Body.toString());

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: { ...body, timePassed, scale },
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error getting stats for places', error);
    return errorResponse(500, 'Error while getting stats for places', error);
  }
};
