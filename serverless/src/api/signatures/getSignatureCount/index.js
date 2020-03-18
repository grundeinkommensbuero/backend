const { errorResponse } = require('../../../shared/apiResponse');
const {
  getSignatureList,
  getScannedSignatureListsOfUser,
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
          return errorResponse(404, 'No user found with the passed id');
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

// Returns a list of all scans (received or byUser) for this user
const getScansOfUser = async (user, campaignCode) => {
  const userId = user.cognitoId;

  let stats = {
    received: 0,
    scannedByUser: 0,
    receivedList: [],
    scannedByUserList: [],
  };

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
        for (let scan of list.received) {
          stats.received += parseInt(scan.count);

          // add campaign to scan
          scan.campaign = list.campaign;
          stats.receivedList.push(scan);
        }
      }
    }
  }

  // New algorithm: we don't compute the scanned by user
  // anymore by checking the lists, but we use the saved scans
  // inside the user record
  if ('scannedLists' in user) {
    for (let scan of user.scannedLists) {
      // Only add scans, if the scan was for the campaign
      // If no campaign is provided we want every scan
      if (
        scan.campaign.code === campaignCode ||
        typeof campaignCode === 'undefined'
      ) {
        stats.scannedByUser += parseInt(scan.count);

        stats.scannedByUserList.push(scan);
      }
    }
  }

  return stats;
};
