const AWS = require('aws-sdk');
const { getAllUsers } = require('../../../shared/users');
const { getSignatureListsOfUser } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const defaultSignaturesMininmum = 10;

module.exports.handler = async event => {
  try {
    // If there is a query param use it as threshold, otherwise the default
    const signaturesMinimum =
      event.queryStringParameters && event.queryStringParameters.minimum
        ? event.queryStringParameters.minimum
        : defaultSignaturesMininmum;

    const powerUsers = [];

    const users = await getAllUsers();

    // Loop through users to compute the received signatures
    for (let user of users) {
      const signatureLists = await getSignatureListsOfUser(user.cognitoId);

      // For each list sum up the received and scanned by user signatures
      // We want to have object (e.g. { campaign1: { received, scannedByUser }, campaign2: ...})
      // because someone might have signatures for multiple campaigns
      let signatureCount = {};

      user.campaigns = [];

      for (let list of signatureLists) {
        if ('received' in list || 'scannedByUser' in list) {
          // Initialize object
          if (!(list.campaign.code in signatureCount)) {
            signatureCount[list.campaign.code] = {
              received: 0,
              scannedByUser: 0,
            };
          }

          if ('received' in list) {
            for (let scan of list.received) {
              signatureCount[list.campaign.code].received += parseInt(
                scan.count
              );
            }
          }

          if ('scannedByUser' in list) {
            for (let scan of list.scannedByUser) {
              signatureCount[list.campaign.code].scannedByUser += parseInt(
                scan.count
              );
            }
          }
        }
      }

      user.signatureCount = signatureCount;

      // Only add user to power users if he*she had at least x signatures for one campaign
      if (isPowerUser(user, signaturesMinimum)) {
        powerUsers.push(user);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        users: powerUsers,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting power users', error);
    errorResponse('error while getting power users');
  }
};

// Checks if a user is power user by checking if user has more than x
// signatures for one campaign.
// Function also removes campaigns with less signatures from user
const isPowerUser = (user, signaturesMinimum) => {
  let returnValue = false;

  // Iterate over keys in signatureCount and check if one campaign is more than minimum
  for (let campaign in user.signatureCount) {
    if (
      user.signatureCount[campaign].received > signaturesMinimum ||
      user.signatureCount[campaign].scannedByUser > signaturesMinimum
    ) {
      returnValue = true;
    } else {
      delete user.signatureCount[campaign];
    }
  }

  return returnValue;
};
