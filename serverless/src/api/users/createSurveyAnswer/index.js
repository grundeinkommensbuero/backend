const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    if (!validateParams(requestBody, event.pathParameters)) {
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

      await saveUser(userId, requestBody);

      // updating user was successful, return appropriate json
      return {
        statusCode: 201,
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

const validateParams = (body, pathParameters) => {
  return 'userId' in pathParameters && 'surveyCode' in body && 'answer' in body;
};

const saveUser = (userId, { answer, surveyCode }) => {
  const timestamp = new Date().toISOString();

  const data = {
    ':survey': [
      {
        answer,
        code: surveyCode,
        timestamp,
      },
    ],
    ':emptyList': [],
  };

  const updateExpression =
    'SET surveys = list_append(if_not_exists(surveys, :emptyList), :survey)';

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
