const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = process.env.SIGNATURES_TABLE_NAME || 'prod-signatures';

// function to get a list by id
const getSignatureList = id => {
  const params = {
    TableName: tableName,
    Key: {
      id: id,
    },
  };
  return ddb.get(params).promise();
};

//function to get signature lists for this particular user
const getSignatureListsOfUser = async (
  userId,
  campaignCode = null,
  signatureLists = [],
  startKey = null
) => {
  let filter;
  let values = { ':userId': userId };
  if (campaignCode) {
    filter = 'userId = :userId AND campaign.code = :campaignCode';
    values[':campaignCode'] = campaignCode;
  } else {
    filter = 'userId = :userId';
  }

  const params = {
    TableName: tableName,
    FilterExpression: filter,
    ExpressionAttributeValues: values,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getSignatureListsOfUser(
      userId,
      campaignCode,
      signatureLists,
      result.LastEvaluatedKey
    );
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

// function to get all signature lists of a specific user, where there is a received
// or scannedByUser key
const getScannedSignatureListsOfUser = async (
  userId,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression:
      '(attribute_exists(received) OR attribute_exists(scannedByUser)) AND userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getScannedSignatureListsOfUser(
      userId,
      signatureLists,
      result.LastEvaluatedKey
    );
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

//function to get all signature lists, where there is a received key
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
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getScannedSignatureLists(
      signatureLists,
      result.LastEvaluatedKey
    );
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

//function to get all signature lists
const getAllSignatureLists = async (signatureLists = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getAllSignatureLists(signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

//Checks, if the passed id already exists in the signatures table (returns true or false)
const checkIfIdExists = async id => {
  const params = {
    TableName: tableName,
    Key: {
      id: id,
    },
    ProjectionExpression: 'id',
  };
  const result = await ddb.get(params).promise();
  //if there is Item in result, there was an entry found
  return 'Item' in result && typeof result.Item !== 'undefined';
};

// Function to compute the stats for all lists (every User)
const getSignatureCountOfAllLists = async () => {
  let stats = {};

  //get all lists with received attribute
  const signatureLists = await getScannedSignatureLists();

  // loop through lists to compute the stats for each campaign
  for (let list of signatureLists) {
    const campaign = list.campaign.code;
    const userId = list.userId;

    // check if campaign  is already in stats
    if (!(campaign in stats)) {
      // initialize object for this campaign
      stats[campaign] = {};
    }

    // Check if user is already in the campaign
    if (!(userId in stats[campaign])) {
      // initialize object for this user in the campaign
      stats[campaign][list.userId] = {
        withoutMixed: 0,
        withMixed: 0,
        from27: 0,
        scannedByUser: 0,
      };
    }

    if ('received' in list && list.received !== 0) {
      // loop through scans for this list and add the count
      for (let scan of list.received) {
        // if there were signatures on this list, which belong to
        // different "Ämters" (mixed), only add the count to withMixed
        if (!scan.mixed) {
          stats[campaign][userId].withoutMixed += parseInt(scan.count);
        }

        // HACK: if campaign is hamburg and scan was done after 27th Feb
        // do not count it!
        if (campaign === 'hamburg-1') {
          if (new Date(scan.timestamp) < new Date()) {
            stats[campaign][userId].withMixed += parseInt(scan.count);
          } else {
            stats[campaign][userId].from27 += parseInt(scan.count);
          }
        } else {
          stats[campaign][userId].withMixed += parseInt(scan.count);
        }
      }
    }

    // same for scannedByUser
    if ('scannedByUser' in list) {
      for (let scan of list.scannedByUser) {
        stats[campaign][userId].scannedByUser += parseInt(scan.count);
      }
    }
  }

  const computedStats = {};

  // Loop through map to check if the scannedByUser count is higher than the received count
  for (let campaign in stats) {
    computedStats[campaign] = {
      withMixed: 0,
      withoutMixed: 0,
      from27: 0,
      scannedByUser: 0,
      computed: 0,
    };

    for (let userId in stats[campaign]) {
      // Computed always takes the higher number of scannedByUser or received
      computedStats[campaign].computed += Math.max(
        stats[campaign][userId].scannedByUser,
        stats[campaign][userId].withMixed
      );

      computedStats[campaign].withMixed += stats[campaign][userId].withMixed;
      computedStats[campaign].withoutMixed +=
        stats[campaign][userId].withoutMixed;
      computedStats[campaign].scannedByUser +=
        stats[campaign][userId].scannedByUser;

      computedStats[campaign].from27 += stats[campaign][userId].from27;
    }
  }

  return computedStats;
};

module.exports = {
  getSignatureList,
  getSignatureListsOfUser,
  getScannedSignatureListsOfUser,
  getScannedSignatureLists,
  checkIfIdExists,
  getSignatureCountOfAllLists,
  getAllSignatureLists,
};
