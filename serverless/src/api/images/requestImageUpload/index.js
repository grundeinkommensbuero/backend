const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const uuid = require('uuid/v4');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { getFileSuffix } = require('../../../shared/utils');
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const bucket = process.env.IMAGE_BUCKET;
const stage = process.env.STAGE;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    if (!validateParams(requestBody)) {
      return errorResponse(
        400,
        'User id or contentType was not provided or contentType is not png or jpg'
      );
    }

    try {
      const { userId, contentType } = requestBody;
      const result = await getUser(userId);

      //if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(400, 'No user found with the passed user id');
      }

      // Get pre signed url to be able to upload image to s3
      const uploadUrl = await getSignedUrl(userId, contentType);

      return {
        statusCode: 201,
        headers: responseHeaders,
        body: JSON.stringify({
          uploadUrl,
        }),
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log('Error while getting presigned url', error);
      return errorResponse(500, 'Error while getting presigned url', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

// Uploads image to s3 bucket
const getSignedUrl = (userId, contentType) => {
  const imageId = uuid();

  const params = {
    Bucket: bucket,
    ACL: 'public-read',
    Key: `${stage}/originals/${imageId}.${getFileSuffix(contentType)}`,
    ContentType: contentType,
    Metadata: {
      contentType,
      userId,
    },
  };

  return s3.getSignedUrlPromise('putObject', params);
};

// Validates request body for missing params or wrong content types
const validateParams = body => {
  if (!('userId' in body) || !('contentType' in body)) {
    return false;
  }

  const { contentType } = body;
  return contentType === 'image/png' || contentType === 'image/jpeg';
};
