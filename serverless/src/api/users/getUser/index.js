const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    //get user id from path parameter
    const userId = event.pathParameters.userId;

    const result = await getUser(userId);
    //if user does not have Item as property, there was no user found
    if (!('Item' in result) || typeof result.Item === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    const user = result.Item;

    const userData = {
      profilePictures: user.profilePictures,
      questions: user.questions,
      hasZipCode: 'zipCode' in user,
    };

    if ('username' in user) {
      userData.username = user.username;
    }

    // return user
    return {
      statusCode: 200,
      body: JSON.stringify({
        user: userData,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error', error);
    return errorResponse(500, 'Error while getting user from table', error);
  }
};
