const AWS = require('aws-sdk');
const { getScannedSignatureLists } = require('../../../shared/signatures');
const { getUser } = require('../../../shared/users');
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

    //user object will contain signature count for a specific user id
    const usersMap = {};

    const signatureLists = await getScannedSignatureLists();

    // For each list sum up the received and scanned by user signatures

    for (let list of signatureLists) {
      // Intiailize object in map
      if (!(list.userId in usersMap)) {
        usersMap[list.userId] = { signatureCount: {} };
      }

      // Initialize signature count object for this user
      if (!(list.campaign.code in usersMap[list.userId].signatureCount)) {
        usersMap[list.userId].signatureCount[list.campaign.code] = {
          received: 0,
          scannedByUser: 0,
        };
      }

      if ('received' in list) {
        for (let scan of list.received) {
          usersMap[list.userId].signatureCount[
            list.campaign.code
          ].received += parseInt(scan.count);
        }
      }

      if ('scannedByUser' in list) {
        for (let scan of list.scannedByUser) {
          usersMap[list.userId].signatureCount[
            list.campaign.code
          ].scannedByUser += parseInt(scan.count);
        }
      }
    }

    // use function to only get the users which have sent or scanned at least x signatures
    const powerUsers = computePowerUsers(usersMap, signaturesMinimum);

    // For every power user make call to db to get email etc
    for (let user of powerUsers) {
      const result = await getUser(user.userId);

      // user might not exist anymore because he*she was deleted
      if ('Item' in result) {
        user.email = result.Item.email;
        user.newsletterConsent = result.Item.newsletterConsent;
        user.stillExists = true;
      } else {
        user.stillExists = false;
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
    return errorResponse('error while getting power users');
  }
};

// Function to get all the users out of the users map
// which have sent or scanned at least x signatures
const computePowerUsers = (usersMap, signaturesMinimum) => {
  const powerUsers = [];

  for (let userId in usersMap) {
    const user = usersMap[userId];

    // Only add user to power users if he*she had at least x signatures for one campaign
    if (isPowerUser(user, signaturesMinimum)) {
      user.userId = userId;
      powerUsers.push(user);
    }
  }

  return powerUsers;
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
