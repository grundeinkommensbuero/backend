const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
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

    const { body, campaignCode, type } = JSON.parse(event.body);

    if (!validateParams(userId, type)) {
      return errorResponse(400, 'User id or type was not provided');
    }

    const timestamp = new Date().toISOString();
    try {
      const result = await getUser(userId);
      // if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      try {
        // otherwise proceed
        const createdInteraction = await updateUser(
          userId,
          body,
          timestamp,
          campaignCode,
          type
        );

        // return message (no content)
        return {
          statusCode: 201,
          headers: responseHeaders,
          isBase64Encoded: false,
          body: JSON.stringify({
            message: 'Successfully created new interaction',
            interaction: createdInteraction,
          }),
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

const updateUser = async (userId, body, timestamp, campaignCode, type) => {
  // create a (nice to later work with) object, which campaign it is
  const campaign =
    typeof campaignCode !== 'undefined'
      ? constructCampaignId(campaignCode)
      : null;

  const interactionObject = { timestamp, type };

  if (typeof body !== 'undefined') {
    interactionObject.body = body;
  }

  if (campaign !== null) {
    interactionObject.campaign = campaign;
  }

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      'SET interactions = list_append(if_not_exists(interactions, :emptyList),:interaction)',
    ExpressionAttributeValues: {
      ':interaction': [interactionObject],
      ':emptyList': [],
    },
  };

  await ddb.update(params).promise();

  return interactionObject;
};

const validateParams = (userId, type) => {
  return typeof userId !== 'undefined' && typeof type !== 'undefined';
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};
