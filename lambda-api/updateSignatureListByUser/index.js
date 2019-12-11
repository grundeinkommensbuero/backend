const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const signaturesTableName = process.env.TABLE_NAME_SIGNATURES;
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async event => {
  try {
    //get user id from path parameter
    const { listId } = event.pathParameters;
    const { count } = JSON.parse(event.body);

    //if the listId is somehow undefined or null return error
    if (
      typeof listId === 'undefined' ||
      listId === null ||
      typeof count === 'undefined'
    ) {
      return errorResponse(400, 'List id or count not provided in request');
    }

    try {
      //check if there even is a list with the id
      //(update creates a new entry, if it does not exist)
      const result = await getSignatureList(listId);
      //if user does not have Item as property, there was no user found
      if (!('Item' in result)) {
        return errorResponse(400, 'No list found with the passed id');
      }

      //otherwise proceed by updating dynamo ressource
      try {
        await updateSignatureList(listId, count);
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

//function to get a list by id
const getSignatureList = id => {
  const params = {
    TableName: signaturesTableName,
    Key: {
      id: id,
    },
  };
  return ddb.get(params).promise();
};

//function to set the count for the signature list
const updateSignatureList = (id, count) => {
  const params = {
    TableName: signaturesTableName,
    Key: { id: id },
    UpdateExpression: 'SET scannedByUser = :count',
    ExpressionAttributeValues: { ':count': count },
  };
  return ddb.update(params).promise();
};

const errorResponse = (statusCode, message, error = null) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message: message,
      error: error,
    });
  } else {
    body = JSON.stringify({
      message: message,
    });
  }
  return {
    statusCode: statusCode,
    body: body,
    headers: responseHeaders,
    isBase64Encoded: false,
  };
};
