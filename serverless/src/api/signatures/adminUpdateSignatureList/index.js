const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { getSignatureList } = require('../../../shared/signatures');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const ddb = DynamoDBDocument.from(new DynamoDB());
const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const usersTableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // get user id from path parameter
    const { listId } = event.pathParameters;
    const { count, mixed } = JSON.parse(event.body);

    // if the listId is somehow undefined or null return error
    if (
      typeof listId === 'undefined' ||
      listId === null ||
      typeof count === 'undefined' ||
      typeof mixed === 'undefined'
    ) {
      return errorResponse(400, 'List id or count not provided in request');
    }

    try {
      // check if there even is a list with the id
      // (update creates a new entry, if it does not exist)
      const result = await getSignatureList(listId);
      // if user does not have Item as property, there was no user found
      if (!('Item' in result)) {
        return errorResponse(404, 'No list found with the passed id');
      }

      // Get user record and update user if list is not anonymous
      const { userId } = result.Item;
      const isAnonymous = userId === 'anonymous';

      const promises = [];

      if (!isAnonymous) {
        const userResult = await getUser(userId);

        // Check if user still exists and update list flow in user record
        if ('Item' in userResult) {
          promises.push(updateUser(userResult.Item));
        }
      }

      // otherwise proceed by updating dynamo resource
      promises.push(updateSignatureList(listId, count, mixed));

      // Execute (maybe) both promises async to increase performance
      await Promise.all(promises);

      // return message
      // We want to return a flag if the list was anonymous
      return {
        statusCode: 200,
        headers: responseHeaders,
        isBase64Encoded: false,
        body: JSON.stringify({
          isAnonymous,
          mailMissing: result.Item.mailMissing,
        }),
      };
    } catch (error) {
      console.log('Error while getting signature list', error);
      return errorResponse(500, 'Error while getting signature list', error);
    }
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

// function to set the count for the signature list
const updateSignatureList = (id, count, mixed) => {
  // needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count, 10),
      mixed,
      timestamp: new Date().toISOString(),
    },
  ];
  const params = {
    TableName: signaturesTableName,
    Key: { id },
    UpdateExpression:
      'SET received = list_append(if_not_exists(received, :emptyList), :count)',
    ExpressionAttributeValues: { ':count': countObject, ':emptyList': [] },
  };
  return ddb.update(params);
};

// Update user record to update list flow
const updateUser = user => {
  const timestamp = new Date().toISOString();

  const listFlow = user.listFlow || {};

  // Update attributes
  // We do not simply override all values because we want to keep the old timestamps
  if (!('downloadedList' in listFlow) || !listFlow.downloadedList.value) {
    listFlow.downloadedList = { value: true, timestamp };
  }

  if (!('printedList' in listFlow) || !listFlow.printedList.value) {
    listFlow.printedList = { value: true, timestamp };
  }

  if (!('signedList' in listFlow) || !listFlow.signedList.value) {
    listFlow.signedList = { value: true, timestamp };
  }

  if (!('sentList' in listFlow) || !listFlow.sentList.value) {
    listFlow.sentList = { value: true, timestamp };
  }

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'SET  listFlow = :listFlow',
    ExpressionAttributeValues: {
      ':listFlow': listFlow,
    },
  };
  return ddb.update(params);
};
