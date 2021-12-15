const AWS = require('aws-sdk');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};
const s3 = new AWS.S3({ region: 'eu-central-1' });
const bucket = 'xbge-active-users-stats';
const stage = process.env.STAGE;

module.exports.handler = async () => {
  try {
    const json = await getStatsJson('stats.json');

    const body = JSON.parse(json.Body.toString());

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: body,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting user count', error);
    return errorResponse(500, 'error while getting user count', error);
  }
};

// Gets json file from s3
const getStatsJson = fileName => {
  const params = {
    Bucket: bucket,
    Key: `${stage}/${fileName}`,
  };

  return s3.getObject(params).promise();
};
