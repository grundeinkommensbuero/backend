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
    //get user id from path parameter
    let userId = event.pathParameters.userId;

    const { question, zipCode, name } = JSON.parse(event.body);

    if (!validateParams(userId, question)) {
      return errorResponse(400, 'User id was not provided');
    }

    const timestamp = new Date().toISOString();
    try {
      const result = await getUser(userId);
      //if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(400, 'No user found with the passed user id');
      }

      try {
        //otherwise proceed by saving the referral and saving a true newsletter consent
        await updateUser(userId, question, timestamp, zipCode, name);

        // return message (no content)
        return {
          statusCode: 204,
          headers: responseHeaders,
          isBase64Encoded: false,
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

const updateUser = (userId, question, timestamp, zipCode, name) => {
  const questionObject = { timestamp, text: question };

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: `
    SET zipCode = if_not_exists(zipCode, :zipCode),
    username = if_not_exists(username, :username),
    questions = list_append(if_not_exists(questions, :emptyList), :question)
    `,
    ExpressionAttributeValues: {
      ':zipCode': zipCode,
      ':username': name,
      ':question': [questionObject],
      ':emptyList': [],
    },
  };
  return ddb.update(params).promise();
};

const validateParams = (userId, question) => {
  return typeof userId !== 'undefined' && typeof question !== 'undefined';
};
