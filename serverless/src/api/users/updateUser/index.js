const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(401, 'No permission to override other user');
    }

    const requestBody = JSON.parse(event.body);

    console.log('request body', requestBody);

    if (!validateParams(event.pathParameters)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    try {
      //check if there is a user with the passed user id
      const { userId } = event.pathParameters;
      const result = await getUser(userId);

      console.log('user', result);

      //if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      await saveUser(userId, requestBody.newsletterConsent);

      //updating user was successful, return appropriate json
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
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const validateParams = pathParameters => {
  return 'userId' in pathParameters;
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};

saveUser = (userId, newsletterConsent) => {
  const timestamp = new Date().toISOString();

  const data = {
    ':newsletterConsent': {
      value:
        // If there is no newsletter consent in the request we set it to true
        typeof newsletterConsent !== 'undefined' ? newsletterConsent : true,
      timestamp: timestamp,
    },
    ':updatedAt': timestamp,
  };

  const updateExpression =
    'set newsletterConsent = :newsletterConsent, updatedAt = :updatedAt';

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};
