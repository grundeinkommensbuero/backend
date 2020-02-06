const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { constructCampaignId } = require('../../../shared/utils');
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');

const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    try {
      console.log('request body', requestBody);

      if (!validateParams(requestBody)) {
        return errorResponse(400, 'One or more parameters are missing');
      }

      try {
        const { userId } = requestBody;

        //check if there is a user with the passed user id
        const result = await getUser(userId);

        console.log('user', result);
        //if user has Item as property, a user was found and therefore already exists
        if ('Item' in result) {
          return errorResponse(401, 'A pledge for this user was already made');
        }

        // if no pledge was made, proceed...

        console.log('result savePledge', await savePledge(requestBody));

        // saving pledge was successfull, return appropriate json
        return {
          statusCode: 201,
          body: JSON.stringify({
            user: { id: userId },
            message: 'User was successfully created',
          }),
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
      return errorResponse(500, 'Non-specific error', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const validateParams = requestBody => {
  return (
    'userId' in requestBody &&
    'email' in requestBody &&
    'newsletterConsent' in requestBody
  );
};

const savePledge = requestBody => {
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
    cognitoId: requestBody.userId,
    email: requestBody.email,
    pledges: [pledge],
    newsletterConsent: {
      value: requestBody.newsletterConsent,
      timestamp: timestamp,
    },
    createdAt: timestamp,
  };

  // Check if certain attributes were sent in request and add them...
  if ('name' in requestBody && requestBody.name !== '') {
    data.username = requestBody.name;
  }

  if ('referral' in requestBody) {
    data.referral = requestBody.referral;
  }

  if ('zipCode' in requestBody) {
    data.zipCode = requestBody.zipCode;
  }

  // If city is the request body we add it (is the case for general pledge)
  if ('city' in requestBody && requestBody.city !== '') {
    data.city = requestBody.city;
  }

  return ddb
    .put({
      TableName: tableName,
      Item: data,
    })
    .promise();
};
