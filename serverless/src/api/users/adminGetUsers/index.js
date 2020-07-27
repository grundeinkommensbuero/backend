const { errorResponse } = require('../../../shared/apiResponse');
const getPowerUsers = require('./getPowerUsers');
const { getUserByMail, getUser } = require('../../../shared/users');
const {
  getScansOfUser,
  getSignatureListsOfUser,
  getSignatureList,
} = require('../../../shared/signatures');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const defaultSignaturesMininmum = 10;

module.exports.handler = async ({ queryStringParameters }) => {
  try {
    let users = [];

    // If filter power users was passed we want to get the power users
    if (queryStringParameters) {
      if (queryStringParameters.filter === 'powerusers') {
        // If there is a query param use it as threshold, otherwise the default
        const signaturesMinimum =
          'minimum' in queryStringParameters
            ? queryStringParameters.minimum
            : defaultSignaturesMininmum;

        users = await getPowerUsers(signaturesMinimum);
      } else {
        // If email or list id was passed we search for user by email
        // or by searching for the list first
        const { email, listId } = queryStringParameters;

        if (typeof email !== 'undefined') {
          const result = await getUserByMail(email);

          if (result.Count === 0) {
            return errorResponse(404, 'No user found');
          }

          users = result.Items;
        } else if (typeof listId !== 'undefined') {
          const signatureListResult = await getSignatureList(listId);

          if (!('Item' in signatureListResult)) {
            return errorResponse(404, 'No list found');
          }

          const userResult = await getUser(signatureListResult.Item.userId);

          if (!('Item' in userResult)) {
            return errorResponse(404, 'No user found for this list');
          }

          users = [userResult.Item];
        }

        for (const user of users) {
          // Get signature count of user
          user.signatureCount = await getScansOfUser(user);

          // Get lists owned by user
          const signatureListResult = await getSignatureListsOfUser(
            user.cognitoId
          );
          user.signatureLists = signatureListResult.Items;
        }
      }
    }

    // If no filter or email is passed just return the empty array
    // TODO: implement returning all users with limit, pagination etc
    return {
      statusCode: 200,
      body: JSON.stringify({
        users,
        count: users.length,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting users', error);
    return errorResponse(500, 'error while getting power users', error);
  }
};
