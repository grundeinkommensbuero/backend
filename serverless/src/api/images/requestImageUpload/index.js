const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const uuid = require('uuid/v4');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const bucket = process.env.IMAGE_BUCKET;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    if (!('userId' in requestBody) || !('contentType' in requestBody)) {
      return errorResponse(400, 'User id or contentType was not provided');
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
    Key: `originals/${imageId}.${getFileSuffix(contentType)}`,
    ContentType: contentType,
    Metadata: {
      contentType,
      userId,
    },
  };

  return s3.getSignedUrlPromise('putObject', params);
};

const getFileSuffix = contentType => {
  return contentType.split('/')[1];
};
