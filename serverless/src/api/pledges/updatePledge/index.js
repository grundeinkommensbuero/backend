const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { savePledge } = require('../../../shared/pledges');

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(
        401,
        'No permission to override pledge of other user'
      );
    }

    const requestBody = JSON.parse(event.body);

    console.log('request body', requestBody);

    if (!validateParams(event, requestBody)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    try {
      //check if there is a user with the passed user id
      const { userId } = event.pathParameters;
      const result = await getUser(userId);

      console.log('user', result);

      //if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      await savePledge(userId, requestBody);

      //saving pledge was successful, return appropriate json
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log(error);
      return errorResponse(500, 'Error saving pledge', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const validateParams = (event, requestBody) => {
  return (
    ('userId' in requestBody || 'userId' in event.pathParameters) &&
    'newsletterConsent' in requestBody
  );
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};
