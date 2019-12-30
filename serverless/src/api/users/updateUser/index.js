const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  //get user id from path parameter
  const userId = event.pathParameters.userId;
  console.log('userId', userId);
  try {
    const requestBody = JSON.parse(event.body);
    const date = new Date();
    const timestamp = date.toISOString();
    try {
      const result = await getUser(userId);
      //if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(400, 'No user found with the passed user id');
      }
      const user = result.Item;
      //if there already is a newsletter consent, then we do not want to overwrite
      if ('newsletterConsent' in user) {
        return errorResponse(401, 'No permission to override pledge', null);
      }
      try {
        //otherwise proceed by saving the referral and saving a true newsletter consent
        await updateUser(userId, requestBody.referral, timestamp);
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
      return errorResponse(500, 'Error while getting user from table', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const updateUser = (userId, referral, timestamp) => {
  const newsletterConsent = {
    value: true,
    timestamp: timestamp,
  };
  //if referral is undefined, don't add the key
  let updateExpression;
  if (typeof referral !== 'undefined') {
    updateExpression =
      'SET newsletterConsent = :newsletterConsent, referral = :referral';
  } else {
    updateExpression = 'SET newsletterConsent = :newsletterConsent';
  }

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: {
      ':newsletterConsent': newsletterConsent,
      ':referral': referral,
    },
  };
  return ddb.update(params).promise();
};
