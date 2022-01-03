const AWS = require('aws-sdk');
const { errorResponse } = require('../../../shared/apiResponse');
const { getUser, unsubscribeUser } = require('../../../shared/users');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    // check if there is a user with the passed user id
    const { userId } = event.pathParameters;
    const { Item: user } = await getUser(userId);

    // if user does not have Item as property, there was no user found
    if (typeof user === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    // If donation should be altered but there is no recurring return error
    if (
      'donation' in requestBody &&
      !('donations' in user) &&
      !('recurringDonation' in user.donations)
    ) {
      return errorResponse(400, 'There is no donation to be altered');
    }

    try {
      // If cancel flag was passed the recurring donation should be cancelled
      if ('donation' in requestBody && requestBody.donation.cancel) {
        await cancelDonation(user);
      }

      if (requestBody.newsletterConsent === false) {
        await unsubscribeUser(user);
      }

      // updating user was successful, return appropriate json
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
      return errorResponse(500, 'Error updating user', error);
    }
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const cancelDonation = ({ cognitoId, donations }) => {
  // We just set a timestamp
  donations.recurringDonation.cancelledAt = new Date().toISOString();

  const params = {
    TableName: tableName,
    Key: { cognitoId },
    UpdateExpression: 'SET donations = :donations',
    ExpressionAttributeValues: { ':donations': donations },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};
