/**
 * This endpoint is used to get stats for municipalities.
 * */

const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const s3 = new AWS.S3(config);
const bucket = 'xbge-municipalities-stats';
const stage = process.env.STAGE;

const { errorResponse } = require('../../../shared/apiResponse');
const { timePassed } = require('../createMunicipalitiesStats');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const scale = [
  [1, 40000],
  [2000, 80000],
];

module.exports.handler = async event => {
  try {
    let shouldSendAllMunicipalities;

    // Check for query params (is null if there is none)
    if (event.queryStringParameters) {
      shouldSendAllMunicipalities = !!event.queryStringParameters.all;
    }

    // Depending on the query params we get a different json file
    const json = await getJson(
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

// Gets json file from s3
const getJson = fileName => {
  const params = {
    Bucket: bucket,
    Key: `${stage}/${fileName}`,
  };

  return s3.getObject(params).promise();
};
