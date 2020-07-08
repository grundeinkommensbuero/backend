const AWS = require('aws-sdk');
const { getUser } = require('../../../shared/users');
const { savePledge } = require('../../../shared/pledges');
const { errorResponse } = require('../../../shared/apiResponse');
const { constructCampaignId } = require('../../../shared/utils');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(
        401,
        'No permission to override pledge of other user'
      );
    }

    const requestBody = JSON.parse(event.body);

    console.log('request body', requestBody);

    if (!validateParams(event, requestBody)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    try {
      const { userId } = event.pathParameters;
      const { pledgeId } = requestBody;
      const result = await getUser(userId);

      console.log('user', result);

      // if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      const { pledges } = result.Item;

      // Check if this pledge already exists
      if (typeof pledges !== 'undefined') {
        const index = pledges.findIndex(
          pledge => pledge.campaign.code === pledgeId
        );

        if (index !== -1) {
          // Pledge already exists
          await updatePledge(userId, pledges, index, requestBody);
        } else {
          // This pledge does not exist
          await savePledge(userId, requestBody);
        }
      } else {
        // No pledges exist
        await savePledge(userId, requestBody);
      }

      // saving pledge was successful, return appropriate json
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log(error);
      return errorResponse(500, 'Error saving pledge', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const validateParams = (event, requestBody) => {
  return 'userId' in event.pathParameters && 'pledgeId' in requestBody;
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};

const updatePledge = (
  userId,
  pledges,
  index,
  { pledgeId, message, signatureCount }
) => {
  const timestamp = new Date().toISOString();

  // check which pledge it is (e.g. pledgeId='brandenburg-1')
  // create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(pledgeId);

  const pledge = {
    campaign,
    createdAt: timestamp,
    // For the general "pledge" (more like a newsletter sign up)
    message,
    // For the state specific pledges a signature count was sent
    signatureCount,
  };

  // Overwrite old pledge with new one
  pledges[index] = pledge;

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET pledges =  :pledges',
    ExpressionAttributeValues: {
      ':pledges': pledges,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};
