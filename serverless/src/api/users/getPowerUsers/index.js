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
      let received = 0;
      let scannedByUser = 0;

      user.campaigns = [];

      for (let list of signatureLists) {
        if ('received' in list) {
          for (let scan of list.received) {
            received += parseInt(scan.count);
          }
        }

        if ('scannedByUser' in list) {
          for (let scan of list.scannedByUser) {
            scannedByUser += parseInt(scan.count);
          }
        }

        // Add the campaign (might also be multiple) to the user
        if (!user.campaigns.includes(list.campaign.code)) {
          user.campaigns.push(list.campaign.code);
        }
      }

      user.received = received;
      user.scannedByUser = scannedByUser;

      // Only add user to power users if he*she had at least x signatures
      if (received > signaturesMinimum || scannedByUser > signaturesMinimum) {
        powerUsers.push(user);
      }
    }

    // Sort power users array by received signatures
    powerUsers.sort((user1, user2) => user2.received - user1.received);

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
