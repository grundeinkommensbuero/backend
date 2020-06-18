const AWS = require('aws-sdk');
const { getSignatureList } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');
const { getUserByMail, getUser } = require('../../../shared/users');

const ddb = new AWS.DynamoDB.DocumentClient();
const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const usersTableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // get user id from path parameter
    const body = JSON.parse(event.body);
    const { listId } = event.pathParameters;
    const { email } = body;
    let { userId, count } = body;

    // if the one of the needed params is somehow undefined return error
    if (!validateParams(listId, count)) {
      return errorResponse(400, 'Params not provided or incorrect in request');
    }

    count = parseInt(count, 10);

    let usedQrCode = false;
    let listNotFound = false;

    try {
      // check if there even is a list with the id
      // (update creates a new entry, if it does not exist)
      const listResult = await getSignatureList(listId);

      // if result does not have Item as property, there was no list found
      if (!('Item' in listResult)) {
        listNotFound = true;
      }

      if (typeof email !== 'undefined') {
        // email was provided,
        const result = await getUserByMail(email);

        if (result.Count === 0) {
          // Depending on whether the list was also not found we return different things
          const response = listNotFound
            ? {
                message:
                  'No user with that email and no list with that id  found',
                errorCode: 'listAndUserNotFound',
              }
            : {
                message: 'No user with that email found',
                errorCode: 'userNotFound',
              };

          return {
            statusCode: 404,
            body: JSON.stringify(response),
            headers: responseHeaders,
            isBase64Encoded: false,
          };
        }

        userId = result.Items[0].cognitoId;
      } else if (typeof userId !== 'undefined') {
        // Check if user exists
        const result = await getUser(userId);

        if (!('Item' in result)) {
          // Depending on whether the list was also not found we return different things
          const response = listNotFound
            ? {
                message:
                  'No user with that email and no list with that id  found',
                errorCode: 'listAndUserNotFound',
              }
            : {
                message: 'No user with that user id found',
                errorCode: 'userNotFound',
              };

          return {
            statusCode: 404,
            body: JSON.stringify(response),
            headers: responseHeaders,
            isBase64Encoded: false,
          };
        }
      } else {
        // If no user id or list id was passed, the user used the qr code
        usedQrCode = true;
      }

      // If only the list was not found we return that information
      if (listNotFound) {
        return {
          statusCode: 404,
          body: JSON.stringify({
            message: 'No list found with the passed id',
            errorCode: 'listNotFound',
          }),
          headers: responseHeaders,
          isBase64Encoded: false,
        };
      }

      // Get campaign from signature list
      const { campaign } = listResult.Item;

      // Proceed by updating dynamo resources
      try {
        // Only update user, if there is a userId defined
        const promises = [
          updateSignatureList(listId, userId, count, usedQrCode),
        ];

        if (typeof userId !== 'undefined') {
          promises.push(updateUser(userId, listId, count, campaign));
        }

        await Promise.all(promises);

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

// function to set the count for the signature list
const updateSignatureList = (id, userId, count, usedQrCode) => {
  // needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count, 10),
      timestamp: new Date().toISOString(),
      userId,
      usedQrCode,
    },
  ];

  const params = {
    TableName: signaturesTableName,
    Key: { id },
    UpdateExpression:
      'SET scannedByUser = list_append(if_not_exists(scannedByUser, :emptyList), :count)',
    ExpressionAttributeValues: { ':count': countObject, ':emptyList': [] },
  };
  return ddb.update(params).promise();
};

// Update user record to add the scan of this list
const updateUser = (userId, listId, count, campaign) => {
  // needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count, 10),
      timestamp: new Date().toISOString(),
      listId,
      campaign,
    },
  ];

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      'SET scannedLists = list_append(if_not_exists(scannedLists, :emptyList), :count)',
    ExpressionAttributeValues: { ':count': countObject, ':emptyList': [] },
  };
  return ddb.update(params).promise();
};

const validateParams = (listId, count) => {
  if (typeof listId === 'undefined' || typeof count === 'undefined') {
    return false;
  }

  const parsedCount = parseInt(count, 10);
  return (
    Number.isInteger(parsedCount) && parsedCount >= 0 && parsedCount < 1000
  );
};
