const { errorResponse } = require('../../../shared/apiResponse');
const {
  getUser,
  deleteUserInDynamo,
  deleteUserInCognito,
} = require('../../../shared/users');

module.exports.handler = async event => {
  try {
    // check if there is a user with the passed user id
    const { userId } = event.pathParameters;
    const { Item: user } = await getUser(userId);

    // if user does not have Item as property, there was no user found
    if (typeof user === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    try {
      // Delete user in dynamo and cognito
      await Promise.all([
        deleteUserInDynamo(userId),
        deleteUserInCognito(userId),
      ]);

      // updating user was successful, return appropriate json
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
      return errorResponse(500, 'Error deleting user', error);
    }
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};
