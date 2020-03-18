const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { getSignatureList } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');
const { getUserByMail, getUser } = require('../../../shared/users');

const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const usersTableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    //get user id from path parameter
    const body = JSON.parse(event.body);
    const { listId } = event.pathParameters;
    const { email } = body;
    let { userId, count } = body;

    //if the one of the needed params is somehow undefined return error
    if (!validateParams(listId, count)) {
      return errorResponse(400, 'Params not provided or incorrect in request');
    }

    count = parseInt(count);

    let usedQrCode = false;

    try {
      // check if there even is a list with the id
      // (update creates a new entry, if it does not exist)
      const result = await getSignatureList(listId);

      // if result does not have Item as property, there was no list found
      if (!('Item' in result)) {
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

      if (typeof email !== 'undefined') {
        // email was provided,
        const result = await getUserByMail(email);

        if (result.Count === 0) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: 'No user with that email found',
              errorCode: 'userNotFound',
            }),
            headers: responseHeaders,
            isBase64Encoded: false,
          };
        }

        userId = result.Items[0].cognitoId;
      } else if (typeof userId !== 'undefined') {
        // Check if user exists
        const result = await getUser(userId);

        if (!('Item' in result)) {
          return {
            statusCode: 404,
            body: JSON.stringify({
              message: 'No user with that user id found',
              errorCode: 'userNotFound',
            }),
            headers: responseHeaders,
            isBase64Encoded: false,
          };
        }
      } else {
        // If no user id or list id was passed, the user used the qr code
        usedQrCode = true;
      }

      // Proceed by updating dynamo resources
      try {
        // Only update user, if there is a userId defined
        const promises = [
          updateSignatureList(listId, userId, count, usedQrCode),
        ];

        if (typeof userId !== 'undefined') {
          promises.push(updateUser(userId, listId, count, usedQrCode));
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

//function to set the count for the signature list
const updateSignatureList = (id, userId, count, usedQrCode) => {
  //needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count),
      timestamp: new Date().toISOString(),
      userId,
      usedQrCode,
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

// Update user record to add the scan of this list
const updateUser = (userId, listId, count, usedQrCode) => {
  //needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count),
      timestamp: new Date().toISOString(),
      listId,
      usedQrCode,
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

  const parsedCount = parseInt(count);
  return (
    Number.isInteger(parsedCount) && parsedCount >= 0 && parsedCount < 1000
  );
};
