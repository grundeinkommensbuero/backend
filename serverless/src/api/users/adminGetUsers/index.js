const { errorResponse } = require('../../../shared/apiResponse');
const getPowerUsers = require('./getPowerUsers');
const { getUserByMail } = require('../../../shared/users');
const {
  getScansOfUser,
  getSignatureListsOfUser,
} = require('../../../shared/signatures');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const defaultSignaturesMininmum = 10;

module.exports.handler = async ({ queryStringParameters }) => {
  try {
    // If filter power users was passed we want to get the power users
    if (
      queryStringParameters &&
      queryStringParameters.filter === 'powerusers'
    ) {
      // If there is a query param use it as threshold, otherwise the default
      const signaturesMinimum =
        queryStringParameters && queryStringParameters.minimum
          ? queryStringParameters.minimum
          : defaultSignaturesMininmum;

      const powerUsers = await getPowerUsers(signaturesMinimum);

      return {
        statusCode: 200,
        body: JSON.stringify({
          users: powerUsers,
          count: powerUsers.length,
        }),
        headers: responseHeaders,
        isBase64Encoded: false,
      };
    }
    // If email was passed we search for user by email
    if (queryStringParameters && queryStringParameters.email) {
      const result = await getUserByMail(queryStringParameters.email);

      if (result.Count > 0) {
        const users = result.Items;
        for (const user of users) {
          // Get signature count of user
          user.signatureCount = await getScansOfUser(user);

          // Get lists owned by user
          const signatureListResult = await getSignatureListsOfUser(
            user.cognitoId
          );
          user.signatureLists = signatureListResult.Items;
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            users,
            count: users.length,
          }),
          headers: responseHeaders,
          isBase64Encoded: false,
        };
      }

      return errorResponse(404, 'No user found');
    }

    // If no filter or email is passed we pass an empty array for now
    // TODO: implement returning all users with limit, pagination etc
    return {
      statusCode: 200,
      body: JSON.stringify({
        users: [],
        count: 0,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting users', error);
    return errorResponse(500, 'error while getting power users', error);
  }
};
