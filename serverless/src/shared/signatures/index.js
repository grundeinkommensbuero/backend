const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = process.env.SIGNATURES_TABLE_NAME || 'prod-signatures';
const { getSignatureCountFromContentful } = require('./contentfulApi');

// function to get a list by id
const getSignatureList = id => {
  const params = {
    TableName: tableName,
    Key: {
      id,
    },
  };
  return ddb.get(params).promise();
};

// function to get signature lists for this particular user
const getSignatureListsOfUser = async (userId, campaignCode = null) => {
  const params = {
    TableName: tableName,
    IndexName: 'userIdIndex',
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  // If a campaign code is provided add a filter expression
  if (campaignCode) {
    params.FilterExpression = 'campaign.code = :campaignCode';
    params.ExpressionAttributeValues[':campaignCode'] = campaignCode;
  }

  return ddb.query(params).promise();
};

// function to get all signature lists of a specific user, where there is a received
// or scannedByUser key
const getScannedSignatureListsOfUser = async userId => {
  const params = {
    TableName: tableName,
    IndexName: 'userIdIndex',
    KeyConditionExpression: 'userId = :userId',
    FilterExpression:
      '(attribute_exists(received) OR attribute_exists(scannedByUser))',
    ExpressionAttributeValues: { ':userId': userId },
  };

  return ddb.query(params).promise();
};

// function to get all signature lists, where there is a received or scannedByUser key
const getScannedSignatureLists = async (
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression:
      'attribute_exists(received) OR attribute_exists(scannedByUser)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getScannedSignatureLists(
      signatureLists,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return signatureLists;
};

// function to get all signature lists, where there is no received or scannedByUser key
const getNotReceivedSignatureLists = async (
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_not_exists(received)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getNotReceivedSignatureLists(
      signatureLists,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return signatureLists;
};

// function to get all signature lists
const getAllSignatureLists = async (signatureLists = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getAllSignatureLists(signatureLists, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return signatureLists;
};

// Checks, if the passed id already exists in the signatures table (returns true or false)
const checkIfIdExists = async id => {
  const params = {
    TableName: tableName,
    Key: {
      id,
    },
    ProjectionExpression: 'id',
  };
  const result = await ddb.get(params).promise();
  // if there is Item in result, there was an entry found
  return 'Item' in result && typeof result.Item !== 'undefined';
};

// Function to compute the stats for all lists (every User)
const getSignatureCountOfAllLists = async () => {
  const stats = {};

  // Get all lists with received attribute and
  // make api call to contentful to later compute the total number of signatures
  // Use Promise.all() to boost performance
  const [signatureLists, contentfulCounts] = await Promise.all([
    getScannedSignatureLists(),
    getSignatureCountFromContentful(),
  ]);

  // loop through lists to compute the stats for each campaign
  for (const list of signatureLists) {
    const campaign = list.campaign.code;

    // check if campaign  is already in stats
    if (!(campaign in stats)) {
      // initialize object for this campaign
      stats[campaign] = {
        withoutMixed: 0,
        withMixed: 0,
        scannedByUser: 0,
        // These are the counts for lists which are not the default list
        // without barcode and not the soli ort list, so people we assume
        // go through the online journey
        scannedByUserOnlineLists: 0,
        receivedOnlineLists: 0,
        // These are the default lists (no barcode), so we assume they are the ones
        // uses for street collection
        scannedByUserDefaultLists: 0,
        receivedDefaultLists: 0,
        computed: 0,
        withoutAnonymous: 0,
        userMap: {},
      };
    }

    const scans = [];
    if ('received' in list && list.received !== 0) {
      // loop through scans for this list and add the count
      for (const scan of list.received) {
        // if there were signatures on this list, which belong to
        // different "Ämters" (mixed), only add the count to withMixed
        // This is only important for schleswig-holstein
        if (!scan.mixed) {
          stats[campaign].withoutMixed += parseInt(scan.count, 10);
        }

        stats[campaign].withMixed += parseInt(scan.count, 10);

        if (list.userId !== 'anonymous') {
          stats[campaign].withoutAnonymous += parseInt(scan.count, 10);

          // We want to create a user map to later count the signatures by power users
          if (!(list.userId in stats[campaign].userMap)) {
            stats[campaign].userMap[list.userId] = 0;
          }

          stats[campaign].userMap[list.userId] += parseInt(scan.count, 10);
        }

        if (!list.manually && list.id !== '0' && list.id !== '1') {
          stats[campaign].receivedOnlineLists += parseInt(scan.count, 10);
        }

        if (list.id === '0' || list.id === '1') {
          stats[campaign].receivedDefaultLists += parseInt(scan.count, 10);
        }

        // Needed for computation of approximated count of signatures
        scans.push({ ...scan, isReceived: true });
      }
    }

    // same for scannedByUser
    if ('scannedByUser' in list) {
      for (const scan of list.scannedByUser) {
        stats[campaign].scannedByUser += parseInt(scan.count, 10);

        // Needed for computation of approximated count of signatures
        scans.push({ ...scan, isReceived: false });

        if (!list.manually && list.id !== '0' && list.id !== '1') {
          stats[campaign].scannedByUserOnlineLists += parseInt(scan.count, 10);
        }

        if (list.id === '0' || list.id === '1') {
          stats[campaign].scannedByUserDefaultLists += parseInt(scan.count, 10);
        }
      }
    }

    stats[campaign].computed += getComputedCountForList(scans);
  }

  // We have to add the numbers from the bb platform to
  // the normal brandenburg campaign
  if ('dibb-1' in stats && 'brandenburg-1' in stats) {
    stats['brandenburg-1'].withoutMixed += stats['dibb-1'].withoutMixed;
    stats['brandenburg-1'].withMixed += stats['dibb-1'].withMixed;
    stats['brandenburg-1'].computed += stats['dibb-1'].computed;
    stats['brandenburg-1'].scannedByUser += stats['dibb-1'].scannedByUser;
  }

  // Add contentful numbers to each campaign
  for (const campaign in stats) {
    if (Object.prototype.hasOwnProperty.call(stats, campaign)) {
      stats[campaign].withContentful = stats[campaign].computed;

      // Check if there is even a campaign defined in contentful
      // for example not the case for dibb
      if (campaign in contentfulCounts) {
        // addToSignatureCount is a sort of a base number
        // which is defined in contentful
        if (contentfulCounts[campaign].addToSignatureCount) {
          stats[campaign].withContentful +=
            contentfulCounts[campaign].addToSignatureCount;
        }

        // if the minimum contentful signature count is more, use that number
        if (contentfulCounts[campaign].minimum) {
          stats[campaign].withContentful = Math.max(
            stats[campaign].withContentful,
            contentfulCounts[campaign].minimum
          );
        }
      }

      // Count power users
      let signaturesOfPowerUsers = 0;
      let powerUserCount = 0;
      for (const userId in stats[campaign].userMap) {
        if (
          Object.prototype.hasOwnProperty.call(stats[campaign].userMap, userId)
        ) {
          const countOfUser = stats[campaign].userMap[userId];
          if (stats[campaign].userMap[userId] > 30) {
            signaturesOfPowerUsers += countOfUser;
            powerUserCount++;
          }
        }
      }

      stats[campaign].ofPowerUsers = signaturesOfPowerUsers;
      stats[campaign].powerUserCount = powerUserCount;
      stats[campaign].userCount = Object.keys(stats[campaign].userMap).length;

      delete stats[campaign].userMap;
    }
  }

  return stats;
};

const getComputedCountForList = scans => {
  // sort array of scans by time (oldest first)
  scans.sort(
    (scan1, scan2) => new Date(scan1.timestamp) - new Date(scan2.timestamp)
  );

  let buffer = 0;
  let received = 0;
  let count = 0;

  for (const scan of scans) {
    const scanCount = parseInt(scan.count, 10);

    if (!scan.isReceived) {
      count += scanCount;
      buffer += scanCount;
    } else {
      received += scanCount;

      buffer -= scanCount;

      if (buffer < 0) {
        buffer = 0;

        count = received;
      }
    }
  }

  return count;
};

// Returns a list of all scans (received or byUser) for this user
const getScansOfUser = async (user, campaignCode) => {
  const userId = user.cognitoId;

  const stats = {
    received: 0,
    scannedByUser: 0,
    receivedList: [],
    scannedByUserList: [],
  };

  // get all lists of this user with received attribute
  const result = await getScannedSignatureListsOfUser(userId);

  // For each list push the arrays to the general array
  for (const list of result.Items) {
    // Only add scans, if the list was from the campaign
    // If no campaign is provided we want every scan
    if (
      list.campaign.code === campaignCode ||
      typeof campaignCode === 'undefined'
    ) {
      if ('received' in list) {
        for (const scan of list.received) {
          stats.received += parseInt(scan.count, 10);

          // add campaign and list id to scan
          scan.campaign = list.campaign;
          scan.listId = list.id;
          stats.receivedList.push(scan);
        }
      }
    }
  }

  // New algorithm: we don't compute the scanned by user
  // anymore by checking the lists, but we use the saved scans
  // inside the user record
  if ('scannedLists' in user) {
    for (const scan of user.scannedLists) {
      // Only add scans, if the scan was for the campaign
      // If no campaign is provided we want every scan
      if (
        scan.campaign.code === campaignCode ||
        typeof campaignCode === 'undefined'
      ) {
        stats.scannedByUser += parseInt(scan.count, 10);

        stats.scannedByUserList.push(scan);
      }
    }
  }

  return stats;
};

module.exports = {
  getSignatureList,
  getSignatureListsOfUser,
  getScannedSignatureListsOfUser,
  getScannedSignatureLists,
  getNotReceivedSignatureLists,
  checkIfIdExists,
  getSignatureCountOfAllLists,
  getAllSignatureLists,
  getComputedCountForList,
  getScansOfUser,
};
