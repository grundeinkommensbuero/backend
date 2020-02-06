const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { constructCampaignId } = require('../../shared/utils');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(
        401,
        'No permission to override pledge of other user'
      );
    }

    const requestBody = JSON.parse(event.body);

    console.log('request body', requestBody);

    if (!validateParams(event, requestBody)) {
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

      await savePledge(userId, requestBody);

      //saving pledge was successful, return appropriate json
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
      return errorResponse(500, 'Error saving pledge', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const validateParams = (event, requestBody) => {
  return (
    ('userId' in requestBody || 'userId' in event.pathParameters) &&
    'newsletterConsent' in requestBody
  );
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};

savePledge = (userId, requestBody) => {
  const date = new Date();
  const timestamp = date.toISOString();

  //check which pledge it is (e.g. pledgeId='brandenburg-1')
  //create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(requestBody.pledgeId);

  const pledge = {
    campaign: campaign,
    createdAt: timestamp,
  };
  // For the state specific pledges a signature count was sent
  if ('signatureCount' in requestBody) {
    pledge.signatureCount = requestBody.signatureCount;
  }

  // For the general "pledge" (more like a newsletter sign up)
  if ('message' in requestBody && requestBody.message !== '') {
    pledge.message = requestBody.message;
  }

  const data = {
    //needs to be array because append_list works with an array
    ':pledge': [pledge],
    ':newsletterConsent': {
      value: requestBody.newsletterConsent,
      timestamp: timestamp,
    },
    ':emptyList': [],
  };

  // If city is the request body we add it (is the case for general pledge)
  if ('city' in requestBody && requestBody.city !== '') {
    data[':city'] = requestBody.city;
  }

  if ('zipCode' in requestBody) {
    data[':zipCode'] = requestBody.zipCode;
  }

  if ('name' in requestBody && requestBody.name !== '') {
    data[':username'] = requestBody.name;
  }

  // if there is no pledges key yet we initiate it with an array,
  // otherwise we add the pledge to the array
  const updateExpression = `
  set ${':city' in data ? 'city = :city,' : ''}
  ${':username' in data ? 'username = :username,' : ''}
  ${':zipCode' in data ? 'zipCode = :zipCode,' : ''}
  pledges = list_append(if_not_exists(pledges, :emptyList), :pledge),
  newsletterConsent = :newsletterConsent
  `;

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
