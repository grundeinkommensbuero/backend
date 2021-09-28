const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../../shared/users');
const { errorResponse } = require('../../../../shared/apiResponse');
const { constructCampaignId } = require('../../../../shared/utils');

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

    const { question, campaignCode } = JSON.parse(event.body);

    if (!validateParams(userId)) {
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
        await updateUser(userId, question, timestamp, campaignCode);

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

const updateUser = (userId, question, timestamp, campaignCode) => {
  // create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(campaignCode);

  const questionObject = { timestamp, campaign };

  if (typeof question !== 'undefined') {
    questionObject.body = question;
  }

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      'SET questions = list_append(if_not_exists(questions, :emptyList),:question)',
    ExpressionAttributeValues: {
      ':question': [questionObject],
      ':emptyList': [],
    },
  };
  return ddb.update(params).promise();
};

const validateParams = userId => {
  return typeof userId !== 'undefined';
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};
