const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { errorResponse } = require('../../../shared/apiResponse');
const { getSignatureList } = require('../../../shared/signatures');

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
      const { listId } = event.queryStringParameters;
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
      }

      // if list id was not provided, the user id was provided in query params
      stats = await getSignatureCountOfUser(userId);
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

const getSignatureCountOfUser = async userId => {
  let stats = { received: 0, scannedByUser: 0 };

  //get all lists of this user with received attribute
  const signatureLists = await getReceivedSignatureListsOfUser(userId);

  // For each list sum up the received and the self scanned count
  for (let list of signatureLists) {
    for (let scan of list.received) {
      stats.received += scan.count;
    }

    for (let scan of list.scannedByUser) {
      stats.scannedByUser += scan.count;
    }
  }

  return stats;
};

// Function to compute the stats for all lists (every User)
const getSignatureCountOfAllLists = async () => {
  let stats = {};

  //get all lists with received attribute
  const signatureLists = await getReceivedSignatureLists();

  //loop through lists to compute the stats for each campaign
  for (let list of signatureLists) {
    const campaign = list.campaign.code;

    //check if campaign is already in stats
    if (!(campaign in stats)) {
      //initialize object for this campaign
      stats[campaign] = {
        withoutMixed: 0,
        withMixed: 0,
      };
    }

    if (list.received !== 0) {
      //loop through scans for this list and add the count
      for (let scan of list.received) {
        //if there were signatures on this list, which belong to
        //different "Ämters" (mixed), only add the count to withMixed
        if (!scan.mixed) {
          stats[campaign].withoutMixed += scan.count;
        }

        stats[campaign].withMixed += scan.count;
      }
    }
  }

  return stats;
};

//function to get all signature lists, where there is a received key
const getReceivedSignatureLists = async (
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression: 'attribute_exists(received)',
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
    return getReceivedSignatureLists(signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

//function to get all signature lists of a specific user, where there is a received key
const getReceivedSignatureListsOfUser = async (
  userId,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression: 'attribute_exists(received) AND userId = :userId',
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
    console.log('call get lists recursively');
    return getReceivedSignatureListsOfUser(
      userId,
      signatureLists,
      result.LastEvaluatedKey
    );
  } else {
    //otherwise return the array
    return signatureLists;
  }
};
