const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const {
  getSignatureList,
  getOneSignatureListOfUser,
} = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');
const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    //get user id from path parameter
    const { count, listId, userId } = JSON.parse(event.body);

    //if the listId is somehow undefined or null return error
    if (
      (typeof listId === 'undefined' && typeof userId === 'undefined') ||
      listId === null ||
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
        // Otherwise userId was provided,
        // therefor we want to find a list for this user
        const result = await getOneSignatureListOfUser(userId);

        // if result does not have Item as property, there was no list found
        if (result.Count === 0) {
          return errorResponse(404, 'No list found for this user');
        }

        listToUpdateId = result.Items[0].id;
      }

      // otherwise proceed by updating dynamo resource
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
