/**
 * This endpoint serves as a callback for when users unsubscribe via mailjet
 */

const { getUserByMail } = require('../../../shared/users');

const basicAuth = require('../../../../basicAuth');

// Check if basic auth is not provided in config
if (!basicAuth.password || !basicAuth.username) {
  console.log('No basic auth provided');
}

const { errorResponse } = require('../../../shared/apiResponse');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    if (!basicAuth.password || !basicAuth.username || !isAuthorized(event)) {
      return errorResponse(401, 'No basic auth provided');
    }

    const requestBody = JSON.parse(event.body);

    console.log('body', requestBody);

    // Request body has an array of events
    const { email } = requestBody[0];
    try {
      // check if there is a user with the passed email
      const result = await getUserByMail(email);

      console.log('user', result);

      // if user does not have Item as property, there was no user found
      if (result.Count === 0) {
        console.log('No user found with the passed email');
      } else {
        await updateUser(result.Items[0]);
      }

      // updating user was successful, return appropriate json
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
  const plainCreds = new Buffer(encodedCreds, 'base64').toString().split(':');

  return (
    plainCreds[0] === basicAuth.username && plainCreds[1] === basicAuth.password
  );
};

// Unsubscribe from every newsletter by setting newsletter consent to false,
// as well as setting value in every item in customNewsletters to false
const updateUser = ({ cognitoId, customNewsletters }) => {
  const timestamp = new Date().toISOString();

  // Loop through custom newsletters and set the values to false
  if (typeof customNewsletters !== 'undefined') {
    for (const newsletter of customNewsletters) {
      newsletter.timestamp = timestamp;
      newsletter.value = false;
      newsletter.extraInfo = false;
    }
  }

  const data = {
    ':newsletterConsent': {
      value: false,
      timestamp,
    },
    ':customNewsletters': customNewsletters,
    ':updatedAt': timestamp,
  };

  const updateExpression =
    'set newsletterConsent = :newsletterConsent, customNewsletters = :customNewsletters, updatedAt = :updatedAt';

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};
