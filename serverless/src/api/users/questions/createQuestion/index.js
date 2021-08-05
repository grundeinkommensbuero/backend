const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../../shared/users');
const { errorResponse } = require('../../../../shared/apiResponse');

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
        'No permission to create question for other user'
      );
    }

    // get user id from path parameter
    const userId = event.pathParameters.userId;

    const { question, zipCode, username } = JSON.parse(event.body);

    if (!validateParams(userId, question)) {
      return errorResponse(400, 'User id was not provided');
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
        await updateUser(userId, question, timestamp, zipCode, username);

        // return message (no content)
        return {
          statusCode: 201,
          headers: responseHeaders,
          isBase64Encoded: false,
          body: JSON.stringify({
            message: 'Successfully created new question',
            question,
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

const updateUser = (userId, question, timestamp, zipCode, username) => {
  const questionObject = { timestamp, body: question };

  const values = { ':question': [questionObject] };

  // Zip code and username might not have been passed to endpoint
  if (typeof username !== 'undefined') {
    values[':username'] = username;
  }

  if (typeof zipCode !== 'undefined') {
    values[':zipCode'] = zipCode.toString();
  }

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: `
    SET ${
      typeof zipCode !== 'undefined'
        ? 'zipCode = if_not_exists(zipCode, :zipCode),'
        : ''
    }
    ${
      typeof username !== 'undefined'
        ? 'username = if_not_exists(username, :username),'
        : ''
    }
    questions = :question
    `,
    ExpressionAttributeValues: values,
  };
  return ddb.update(params).promise();
};

const validateParams = (userId, question) => {
  return typeof userId !== 'undefined' && typeof question !== 'undefined';
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};
