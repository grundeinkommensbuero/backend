const AWS = require('aws-sdk');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(401, 'No permission to override other user');
    }

    const requestBody = JSON.parse(event.body);

    console.log('request body', requestBody);

    if (!validateParams(event.pathParameters, requestBody)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    try {
      // check if there is a user with the passed user id
      const { userId } = event.pathParameters;
      const result = await getUser(userId);

      console.log('user', result);

      // if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      await updateUser(userId, requestBody, result.Item);

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
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

// Check if user id is in path params and request body is not empty
const validateParams = (pathParameters, requestBody) => {
  return 'userId' in pathParameters && Object.keys(requestBody).length !== 0;
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};

const updateUser = (
  userId,
  { username, zipCode, city, newsletterConsent },
  user
) => {
  const timestamp = new Date().toISOString();

  const data = {
    ':updatedAt': timestamp,
    ':username': username,
    ':zipCode': zipCode,
    ':city': city,
  };

  if (typeof newsletterConsent !== 'undefined') {
    data[':newsletterConsent'] = {
      value: newsletterConsent,
      timestamp,
    };
  }

  // We want to check if the user was created at the bb platform.
  // In that case we want to set a flag that the user was updated on
  // expedition-grundeinkommen.de
  if (user.source === 'bb-platform') {
    data[':updatedOnXbge'] = true;
  }

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: `
    SET ${
      typeof newsletterConsent !== 'undefined'
        ? 'newsletterConsent = :newsletterConsent,'
        : ''
    }
    ${typeof username !== 'undefined' ? 'username = :username,' : ''}
    ${typeof zipCode !== 'undefined' ? 'zipCode = :zipCode,' : ''}
    ${typeof city !== 'undefined' ? 'city = :city,' : ''}
    ${user.source === 'bb-platform' ? 'updatedOnXbge = :updatedOnXbge,' : ''}
    updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};
