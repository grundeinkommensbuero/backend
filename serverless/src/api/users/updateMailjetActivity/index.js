/**
 * This endpoint serves as a callback for when users unsubscribe via mailjet
 */

const { getUserByMail } = require('../../../shared/users');
const { username, password } = require('../../../../basicAuth');
const { errorResponse } = require('../../../shared/apiResponse');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(401, 'No basic auth provided');
    }

    const requestBody = JSON.parse(event.body);
    console.log('body', requestBody);

    try {
      // Request body has an array of events
      for (const item of requestBody) {
        // check if there is a user with the passed email
        const result = await getUserByMail(item.email);

        // if user does not have Item as property, there was no user found
        if (result.Count === 0) {
          console.log('No user found with the passed email');
        } else {
          await updateUser(result.Items[0], item.event);
        }
      }

      // updating users was successful, return appropriate json
      return {
        statusCode: 200,
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
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

// Checks if basic auth is provided and username and password are correct
const isAuthorized = event => {
  const authorizationHeader = event.headers.Authorization;

  if (!authorizationHeader) {
    return false;
  }

  const encodedCreds = authorizationHeader.split(' ')[1];
  const plainCreds = Buffer.from(encodedCreds, 'base64').toString().split(':');

  return plainCreds[0] === username && plainCreds[1] === password;
};

// Set timestamps for mailjet activity
const updateUser = ({ cognitoId, emailActivity }, event) => {
  const timestamp = new Date().toISOString();

  const newEmailActivity = emailActivity || {};

  if (event === 'open') {
    newEmailActivity.lastOpen = timestamp;
  } else if (event === 'click') {
    newEmailActivity.lastClick = timestamp;
  }

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId },
      UpdateExpression:
        'set emailActivity = :emailActivity, updatedAt = :timestamp',
      ExpressionAttributeValues: {
        ':emailActivity': newEmailActivity,
        ':timestamp': timestamp,
      },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};
