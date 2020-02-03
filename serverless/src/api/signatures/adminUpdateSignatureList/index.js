const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { getSignatureList } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');

const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    //get user id from path parameter
    const { listId } = event.pathParameters;
    const { count, mixed } = JSON.parse(event.body);

    //if the listId is somehow undefined or null return error
    if (
      typeof listId === 'undefined' ||
      listId === null ||
      typeof count === 'undefined' ||
      typeof mixed === 'undefined'
    ) {
      return errorResponse(400, 'List id or count not provided in request');
    }

    try {
      //check if there even is a list with the id
      //(update creates a new entry, if it does not exist)
      const result = await getSignatureList(listId);
      //if user does not have Item as property, there was no user found
      if (!('Item' in result)) {
        return errorResponse(404, 'No list found with the passed id');
      }

      //otherwise proceed by updating dynamo resource
      try {
        await updateSignatureList(listId, count, mixed);
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
const updateSignatureList = (id, count, mixed) => {
  //needs to be array because append_list works with an array
  const countObject = [
    {
      count: parseInt(count),
      mixed,
      timestamp: new Date().toISOString(),
    },
  ];
  const params = {
    TableName: signaturesTableName,
    Key: { id: id },
    UpdateExpression:
      'SET received = list_append(if_not_exists(received, :emptyList), :count)',
    ExpressionAttributeValues: { ':count': countObject, ':emptyList': [] },
  };
  return ddb.update(params).promise();
};
