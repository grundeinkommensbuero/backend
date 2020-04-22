const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const uuid = require('uuid/v4');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { getFileSuffix, isAuthorized } = require('../../../shared/utils');
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const bucket = process.env.IMAGE_BUCKET;
const stage = process.env.STAGE;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    if (!validateParams(event, requestBody)) {
      return errorResponse(
        400,
        'User id or contentType was not provided or contentType is not png or jpg'
      );
    }

    try {
      const { contentType } = requestBody;
      let userId = requestBody.userId || event.pathParameters.userId;

      const result = await getUser(userId);

      // If user is not authorized, we only create the url for non existing users
      if (
        'Item' in result &&
        typeof result.Item !== 'undefined' &&
        !isAuthorized(event)
      ) {
        return errorResponse(
          401,
          'Cannot upload image for existing user without authorization'
        );
      }

      // If user is authorized we want to check, if the user exists
      // Maybe a bit redundant...
      if (
        isAuthorized(event) &&
        (!('Item' in result) || typeof result.Item === 'undefined')
      ) {
        return errorResponse(404, 'User does not exist');
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
const validateParams = (event, body) => {
  if (
    !(
      'userId' in body ||
      (event.pathParameters && 'userId' in event.pathParameters)
    ) ||
    !('contentType' in body)
  ) {
    return false;
  }

  const { contentType } = body;
  return contentType === 'image/png' || contentType === 'image/jpeg';
};
