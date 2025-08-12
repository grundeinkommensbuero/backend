const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const ddb = DynamoDBDocument.from(new DynamoDB());
const { getUser } = require('../../../../shared/users');
const { errorResponse } = require('../../../../shared/apiResponse');
const { constructCampaignId } = require('../../../../shared/utils');

const tableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(
        401,
        'No permission to create interaction for other user'
      );
    }

    // get user id from path parameter
    const userId = event.pathParameters.userId;
    const interactionId = event.pathParameters.interactionId;

    const jsonBody = JSON.parse(event.body);

    if (!validateParams(userId, interactionId)) {
      return errorResponse(400, 'User id or interaction id was not provided');
    }

    try {
      const result = await getUser(userId);
      // if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      const { interactions } = result.Item;

      if (typeof interactions === 'undefined') {
        return errorResponse(404, 'Use has no interactions yet');
      }

      // Check if this interaction exists
      const index = interactions.findIndex(({ id }) => id === interactionId);

      if (index === -1) {
        return errorResponse(404, 'No interaction found with the passed id');
      }

      try {
        // otherwise proceed
        await updateInteraction(userId, interactions, index, jsonBody);

        // return message (no content)
        return {
          statusCode: 204,
          headers: responseHeaders,
          isBase64Encoded: false,
        };
      } catch (error) {
        console.log('error while updating user', error);
        return errorResponse(500, 'error while updating user', error);
      }
    } catch (error) {
      console.log('error', error);
      return errorResponse(500, 'Error while getting user from table', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const updateInteraction = (userId, interactions, index, jsonBody) => {
  const timestamp = new Date().toISOString();

  const { campaignCode, body, type, ...rest } = jsonBody;

  // If an interaction id was passed in the json body we need to remove it,
  // so it is not replaced later when adding values from rest (same with other "reserved" words)
  delete rest.id;
  delete rest.createdAt;
  delete rest.updatedAt;

  const interactionObject = interactions[index];

  // create a (nice to later work with) object, which campaign it is
  const campaign =
    typeof campaignCode !== 'undefined'
      ? constructCampaignId(campaignCode)
      : null;

  // First overwrite existing values
  if (typeof body !== 'undefined') {
    interactionObject.body = body;
  }

  if (typeof type !== 'undefined') {
    interactionObject.type = type;
  }

  if (campaign !== null) {
    interactionObject.campaign = campaign;
  }

  interactionObject.updatedAt = timestamp;

  // Add new values which where passes with the json body and
  // set the item in the array
  interactions[index] = { ...interactionObject, ...rest };

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET interactions = :interactions',
    ExpressionAttributeValues: {
      ':interactions': interactions,
    },
  };

  return ddb.update(params);
};

const validateParams = (userId, interactionId) => {
  return typeof userId !== 'undefined' && typeof interactionId !== 'undefined';
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};
