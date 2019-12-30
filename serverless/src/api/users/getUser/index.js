const AWS = require('aws-sdk');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  //get user id from path parameter
  const userId = event.pathParameters.userId;
  try {
    const user = await getUser(userId);
    console.log('user', user);
    //if user does not have Item as property, there was no user found
    if (!('Item' in user) || typeof user.Item === 'undefined') {
      return errorResponse(400, 'No user found with the passed user id');
    }

    // return user
    return {
      statusCode: 200,
      body: JSON.stringify({
        user: { email: user.Item.email, cognitoId: user.Item.cognitoId },
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    return errorResponse(500, 'Error while getting user from table', error);
  }
};
