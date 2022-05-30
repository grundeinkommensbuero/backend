const { getScannedSignatureLists } = require('../../../shared/signatures');
const { getUser, getUsersWithScannedLists } = require('../../../shared/users');

const getPowerUsers = async signaturesMinimum => {
  // user object will contain signature count for a specific user id
  const usersMap = {};

  const signatureLists = await getScannedSignatureLists();

  // For each list sum up the received and scanned by user signatures

  for (const list of signatureLists) {
    if (list.userId !== 'anonymous') {
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
        for (const scan of list.received) {
          usersMap[list.userId].signatureCount[list.campaign.code].received +=
            parseInt(scan.count, 10);
        }
      }
    }
  }

  // New algorithm: we don't compute the scanned by user
  // anymore by checking the lists, but we use the saved scans
  // inside the user record
  const usersWithScannedLists = await getUsersWithScannedLists();

  for (const user of usersWithScannedLists) {
    // Intiailize object in map
    // (we need to do this here as well, because user might not have had an own list)
    if (!(user.cognitoId in usersMap)) {
      usersMap[user.cognitoId] = { signatureCount: {} };
    }

    for (const scan of user.scannedLists) {
      // Initialize signature count object for this user
      if (!(scan.campaign.code in usersMap[user.cognitoId].signatureCount)) {
        usersMap[user.cognitoId].signatureCount[scan.campaign.code] = {
          received: 0,
          scannedByUser: 0,
        };
      }

      usersMap[user.cognitoId].signatureCount[
        scan.campaign.code
      ].scannedByUser += parseInt(scan.count, 10);
    }
  }

  // use function to only get the users which have sent or scanned at least x signatures
  const powerUsers = computePowerUsers(usersMap, signaturesMinimum);

  // For every power user make call to db to get email etc
  for (const user of powerUsers) {
    const result = await getUser(user.userId);

    // user might not exist anymore because he*she was deleted
    if ('Item' in result) {
      user.email = result.Item.email;
      user.username = result.Item.username;
      user.newsletterConsent = result.Item.newsletterConsent;
      user.stillExists = true;
    } else {
      user.stillExists = false;
    }
  }

  return powerUsers;
};

// Function to get all the users out of the users map
// which have sent or scanned at least x signatures
const computePowerUsers = (usersMap, signaturesMinimum) => {
  const powerUsers = [];

  for (const userId in usersMap) {
    if (Object.prototype.hasOwnProperty.call(usersMap, userId)) {
      const user = usersMap[userId];

      // Only add user to power users if he*she had at least x signatures for one campaign
      if (isPowerUser(user, signaturesMinimum)) {
        user.userId = userId;
        powerUsers.push(user);
      }
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
  for (const campaign in user.signatureCount) {
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

module.exports = getPowerUsers;
