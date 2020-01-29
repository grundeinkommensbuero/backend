const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { errorResponse } = require('../../../shared/apiResponse');
const {
  getSignatureList,
  getScannedSignatureListsOfUser,
  getSignatureCountOfAllLists,
} = require('../../../shared/signatures');
const { getUserByMail } = require('../../../shared/users');

const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
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

      if (typeof listId !== 'undefined') {
        // If list id is provided we need to get the user id of this list
        // so that we can afterwards compute the count for all lists
        // of that user
        const result = await getSignatureList(listId);

        // If there is no key 'Item' in result, no list was found
        if (!('Item' in result)) {
          return errorResponse(404, 'No list found with the passed id');
        }

        userId = result.Item.userId;
      } else if (typeof email !== 'undefined') {
        // If email is provided we need to get the user by mail to get id
        const result = await getUserByMail(email);

        if (result.Count === 0) {
          return errorResponse(404, 'No user with that email found');
        }

        userId = result.Items[0].cognitoId;
      }

      // if list id was not provided, the user id was provided in query params
      stats = await getScansOfUser(userId, campaignCode);
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

// Returns a list of all scans (received or byUser) for this user
const getScansOfUser = async (userId, campaignCode) => {
  let stats = { received: [], scannedByUser: [] };

  //get all lists of this user with received attribute
  const signatureLists = await getScannedSignatureListsOfUser(userId);

  // For each list push the arrays to the general array
  for (let list of signatureLists) {
    // Only add scans, if the list was from the campaign
    // If no campaign is provided we want every scan
    if (
      list.campaign.code === campaignCode ||
      typeof campaignCode === 'undefined'
    ) {
      if ('received' in list) {
        stats.received.push(...list.received);
      }

      if ('scannedByUser' in list) {
        stats.scannedByUser.push(...list.scannedByUser);
      }
    }
  }

  return stats;
};
