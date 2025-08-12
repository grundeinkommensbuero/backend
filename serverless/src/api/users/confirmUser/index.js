/**
 * This function is used as a secondary option to confirm the user (e.g. if first login via code did not work).
 * A token is being sent via the request and if the token is the same as the one in the database, we confirm the user.
 */



const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { errorResponse } = require('../../../shared/apiResponse');
const { getUser } = require('../../../shared/users');

const ddb = DynamoDBDocument.from(new DynamoDB());
const tableName = process.env.USERS_TABLE_NAME;
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;

module.exports.handler = async event => {
  try {
    const { token } = JSON.parse(event.body);

    // get user id from path parameter
    const userId = event.pathParameters.userId;

    const result = await getUser(userId);
    // if user does not have Item as property, there was no user found
    if (!('Item' in result) || typeof result.Item === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    const user = result.Item;

    // If tokens match confirm user
    if (typeof token !== 'undefined' && user.customToken.token === token) {
      if (new Date() - new Date(user.customToken.timestamp) > TWO_WEEKS) {
        return errorResponse(400, 'Token is expired');
      }

      // Get ip address from request (needed for user confirmation)
      const ipAddress = event.requestContext.identity.sourceIp;

      await confirmUser(userId, token, ipAddress);

      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        isBase64Encoded: false,
      };
    }

    return errorResponse(400, 'Token missing or token mismatch');
  } catch (error) {
    console.log('Error', error);
    return errorResponse(500, 'Error confirming useer');
  }
};

const confirmUser = (userId, token, ipAddress) => {
  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET confirmed = :confirmed',
    ExpressionAttributeValues: {
      ':confirmed': {
        value: true,
        timestamp: new Date().toISOString(),
        token,
        ipAddress,
      },
    },
  };

  return ddb.update(params);
};
