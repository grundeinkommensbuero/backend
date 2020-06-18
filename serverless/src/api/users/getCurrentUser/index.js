/**
 *  This endpoint gets the current authenticated user via the route users/me.
 *  The user id is taken from the authorization header.
 */

const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // get user id from auth token
    const userId = event.requestContext.authorizer.claims.sub;

    const result = await getUser(userId);

    // if user does not have Item as property, there was no user found
    if (!('Item' in result) || typeof result.Item === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    const user = result.Item;

    // return user
    return {
      statusCode: 200,
      body: JSON.stringify({ user }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error getting user', error);
    return errorResponse(500, 'Error while getting user from table', error);
  }
};
