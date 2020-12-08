const {
  getUserByMail,
  updateNewsletterConsent,
} = require('../../../shared/users');

const basicAuth = require('../../../../basicAuth');

// Check if basic auth is not provided in config
if (!basicAuth.password || !basicAuth.username) {
  console.log('No basic auth provided');
}

const { errorResponse } = require('../../../shared/apiResponse');

module.exports.handler = async event => {
  try {
    if (!basicAuth.password || !basicAuth.username || !isAuthorized(event)) {
      return errorResponse(401, 'No basic auth provided');
    }

    const requestBody = JSON.parse(event.body);

    console.log('body', requestBody);

    // Request body has an array of events
    const { email } = requestBody[0];
    try {
      // check if there is a user with the passed email
      const result = await getUserByMail(email);

      console.log('user', result);

      // if user does not have Item as property, there was no user found
      if (result.Count === 0) {
        console.log('No user found with the passed email');
      } else {
        await updateNewsletterConsent(result.Items[0].cognitoId, false);
      }

      // updating user was successful, return appropriate json
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log(error);
      return errorResponse(500, 'Error updating user', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

// Checks if basic auth is provided and username and password are correct
const isAuthorized = event => {
  const authorizationHeader = event.headers.Authorization;

  if (!authorizationHeader) {
    return false;
  }

  const encodedCreds = authorizationHeader.split(' ')[1];
  const plainCreds = new Buffer(encodedCreds, 'base64').toString().split(':');

  return (
    plainCreds[0] === basicAuth.username && plainCreds[1] === basicAuth.password
  );
};
