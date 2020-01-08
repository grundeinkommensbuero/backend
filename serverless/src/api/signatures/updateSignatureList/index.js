const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { getSignatureList } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');
const { getUserByMail } = require('../../../shared/users');
const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    //get user id from path parameter
    const body = JSON.parse(event.body);
    const { count, listId, email } = body;
    let { userId } = body;

    //if the one of the needed params is somehow undefined return error
    if (
      (typeof listId === 'undefined' &&
        typeof userId === 'undefined' &&
        typeof email === 'undefined') ||
      typeof count === 'undefined'
    ) {
      return errorResponse(
        400,
        'List id (or user id) or count not provided in request'
      );
    }

    try {
      let listToUpdateId;

      // Check if list id is provided
      if (typeof listId !== 'undefined') {
        // check if there even is a list with the id
        // (update creates a new entry, if it does not exist)
        const result = await getSignatureList(listId);

        // if result does not have Item as property, there was no list found
        if (!('Item' in result)) {
          return errorResponse(404, 'No list found with the passed id');
        }

        listToUpdateId = listId;
      } else {
        // userId or email was provided,
        // therefore we want to find a list for this user

        // if email was provided instead of user id we first need the userid
        if (typeof userId === 'undefined') {
          const result = await getUserByMail(email);

          if (result.Count === 0) {
            return errorResponse(404, 'No user with that email found');
          }

          userId = result.Items[0].cognitoId;
        }

        const list = await getFirstSignatureListOfUser(userId);

        // if function returned null, there was no list found
        if (!list) {
          return errorResponse(404, 'No list found for this user');
        }

        listToUpdateId = list.id;
      }

      // Proceed by updating dynamo resource
      try {
        await updateSignatureList(listToUpdateId, count);
        // return message (no content)
        return {
          statusCode: 204,
          headers: responseHeaders,
          isBase64Encoded: false,
        };
      } catch (error) {
        console.log('Error while updating signature list', error);
        return errorResponse(500, 'Error while updating signature list', error);
      }
    } catch (error) {
      console.log('Error while getting signature list', error);
      return errorResponse(500, 'Error while getting signature list', error);
    }
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

//function to set the count for the signature list
const updateSignatureList = (id, count) => {
  //needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count),
      timestamp: new Date().toISOString(),
    },
  ];
  const params = {
    TableName: signaturesTableName,
    Key: { id: id },
    UpdateExpression:
      'SET scannedByUser = list_append(if_not_exists(scannedByUser, :emptyList), :count)',
    ExpressionAttributeValues: { ':count': countObject, ':emptyList': [] },
  };
  return ddb.update(params).promise();
};

// Function to get the first list of the user
const getFirstSignatureListOfUser = async userId => {
  // First get all lists for this user
  const signatureLists = await getSignatureListsOfUser(userId);

  // if result does not have Item as property, there was no list found
  if (signatureLists.length === 0) {
    return null;
  }

  // Then check the date to get the first one
  let firstList = signatureLists[0];

  for (let list of signatureLists) {
    // Check if this list was created earlier than the current firstList
    if (new Date(list.createdAt) < new Date(firstList.createdAt)) {
      console.log(`${list.createdAt} is earler than ${firstList.createdAt}`);
      firstList = list;
    }
  }

  return firstList;
};

//function to get signature lists for this particular user
const getSignatureListsOfUser = async (
  userId,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression: 'userId = :userId',
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
    return getSignatureLists(userId, signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};
