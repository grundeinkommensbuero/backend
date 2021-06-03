/**
 * This endpoint is used to get info (without stats) for one municipality.
 * The ags (Allgemeiner Gemeindeschlüssel) is passed as path param
 * */

const { errorResponse } = require('../../../shared/apiResponse');
const { getMunicipality } = require('../../../shared/municipalities');
const { getMunicipalityGoal } = require('../../../shared/utils');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    const { ags } = event.pathParameters;
    const result = await getMunicipality(ags);

    console.log('ags', ags);

    if (!('Item' in result)) {
      // No municipality with the passed ags found
      return errorResponse(404, 'No municipality found with the passed ags');
    }

    const municipality = result.Item;
    const goal = getMunicipalityGoal(municipality.population);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: { ...municipality, goal },
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };

    // No query param was passed, therefore we get all municipalities for which people
    // have already signed up and compute the stats
  } catch (error) {
    console.log('error getting municipality', error);
    return errorResponse(500, 'Error while getting  municipality', error);
  }
};
