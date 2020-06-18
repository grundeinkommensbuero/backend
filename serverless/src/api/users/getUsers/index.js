/**
 *  In comparison to getUser this endpoint takes filters through query params
 *  and the endpoint is just /users
 */

const { errorResponse } = require('../../../shared/apiResponse');
const { getUserByMail } = require('../../../shared/users');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // Check for query params (is null if there is none)
    if (event.queryStringParameters) {
      const { email } = event.queryStringParameters;

      // Check if email was passed as query param
      if (typeof email !== 'undefined' && email !== '') {
        // If email is provided we need to get the user by mail to get id
        const result = await getUserByMail(email);

        if (result.Count === 0) {
          return errorResponse(404, 'No user with that email found');
        }

        const user = result.Items[0];

        // return user
        return {
          statusCode: 200,
          body: JSON.stringify({
            users: [
              {
                userId: user.cognitoId,
                newsletterConsent: user.newsletterConsent,
              },
            ],
          }),
          headers: responseHeaders,
          isBase64Encoded: false,
        };
      }
    }

    return errorResponse(400, 'No query params provided');
  } catch (error) {
    console.log('Error getting users', error);
    return errorResponse(500, 'Error while getting users', error);
  }
};
