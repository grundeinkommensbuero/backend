const { errorResponse } = require('../../../shared/apiResponse');
const {
  getSignatureList,
  getScansOfUser,
  getSignatureCountOfAllLists,
} = require('../../../shared/signatures');
const { getUserByMail, getUser } = require('../../../shared/users');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    let stats = {};

    // Check for query params (is null if there is none)
    if (event.queryStringParameters) {
      // If there is a list id or user id we want to count
      // the signatures for just one user
      const { listId, email, campaignCode } = event.queryStringParameters;
      let { userId } = event.queryStringParameters;
      let user;

      if (typeof listId !== 'undefined') {
        // If list id is provided we need to get the user id of this list
        // so that we can afterwards compute the count
        // of that user
        const result = await getSignatureList(listId);

        // If there is no key 'Item' in result, no list was found
        if (!('Item' in result)) {
          return errorResponse(404, 'No list found with the passed id');
        }

        userId = result.Item.userId;
      }

      if (typeof userId !== 'undefined') {
        const result = await getUser(userId);

        // If there is no key 'Item' in result, no user was found
        if (!('Item' in result)) {
          return errorResponse(
            404,
            'No user found with the passed id or user is anonymous'
          );
        }

        user = result.Item;
      } else if (typeof email !== 'undefined') {
        // If email is provided we need to get the user by mail
        const result = await getUserByMail(email);

        if (result.Count === 0) {
          return errorResponse(404, 'No user with that email found');
        }

        user = result.Items[0];
      }
      stats = await getScansOfUser(user, campaignCode);
    } else {
      // No query param provided -> get count for all lists
      stats = await getSignatureCountOfAllLists();
    }

    // return message
    return {
      statusCode: 200,
      headers: responseHeaders,
      isBase64Encoded: false,
      body: JSON.stringify(stats),
    };
  } catch (error) {
    console.log('error while computing stats', error);
    return errorResponse(500, 'Error while computing stats', error);
  }
};
