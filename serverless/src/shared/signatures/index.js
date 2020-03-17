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

    // check if campaign  is already in stats
    if (!(campaign in stats)) {
      // initialize object for this campaign
      stats[campaign] = {
        withoutMixed: 0,
        withMixed: 0,
        scannedByUser: 0,
        computed: 0,
      };
    }

    let scans = [];
    if ('received' in list && list.received !== 0) {
      // loop through scans for this list and add the count
      for (let scan of list.received) {
        // if there were signatures on this list, which belong to
        // different "Ämters" (mixed), only add the count to withMixed
        // This is only important for schleswig-holstein
        if (!scan.mixed) {
          stats[campaign].withoutMixed += parseInt(scan.count);
        }

        stats[campaign].withMixed += parseInt(scan.count);

        // Needed for computation of approximated count of signatures
        scans.push({ ...scan, isReceived: true });
      }
    }

    // same for scannedByUser
    if ('scannedByUser' in list) {
      for (let scan of list.scannedByUser) {
        stats[campaign].scannedByUser += parseInt(scan.count);

        // Needed for computation of approximated count of signatures
        scans.push({ ...scan, isReceived: false });
      }
    }

    stats[campaign].computed += getComputedCountForList(scans);
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

  for (let scan of scans) {
    if (!scan.isReceived) {
      count += scan.count;
      buffer += scan.count;
    } else {
      received += scan.count;

      buffer -= scan.count;

      if (buffer < 0) {
        buffer = 0;

        count = received;
      }
    }
  }

  return count;
};

module.exports = {
  getSignatureList,
  getSignatureListsOfUser,
  getScannedSignatureListsOfUser,
  getScannedSignatureLists,
  checkIfIdExists,
  getSignatureCountOfAllLists,
  getAllSignatureLists,
  getComputedCountForList,
};
