/**
 * This endpoint is used to get one municipality.
 * The ags (Allgemeiner Gemeindeschlüssel) is passed as path param
 * */

const { errorResponse } = require('../../../shared/apiResponse');
const { getMunicipality } = require('../../../shared/municipalities');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    const { ags } = event.pathParameters;
    const result = await getMunicipality(ags);

    if (!('Item' in result)) {
      // No municipality with the passed ags found
      return errorResponse(404, 'No municipality found with the passed ags');
    }

    const municipality = result.Item;

    // Add flags which components should be shown for this municipality
    if (!('showMunicipalityNews' in municipality)) {
      municipality.showMunicipalityNews = false;
    }

    if (!('showListDownload' in municipality)) {
      municipality.showListDownload = true;
    }

    if (!('showCollectionMap' in municipality)) {
      municipality.showCollectionMap = true;
    }

    if (!('showOrganizerContact' in municipality)) {
      municipality.showOrganizerContact = false;
    }

    if (!('phaseCollecting' in municipality)) {
      municipality.phaseCollecting = false;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: municipality,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error getting municipality', error);
    return errorResponse(500, 'Error getting municipality', error);
  }
};
