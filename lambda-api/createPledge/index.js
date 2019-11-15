//const randomBytes = require('crypto').randomBytes;

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TABLE_NAME;

exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    //check if there is a user with the passed user id
    try {
      const date = new Date();
      const timestamp = date.toISOString();
      console.log('request body', requestBody);
      if (!validateParams(requestBody)) {
        return errorResponse(400, 'One or more parameters are missing', null);
      }

      const userId = requestBody.userId;
      const user = await getUser(userId);
      console.log('user', user);
      //if user does not have Item as property, there was no user found
      if (!('Item' in user) || typeof user.Item === 'undefined') {
        return errorResponse(
          400,
          'No user found with the passed user id',
          null
        );
      }

      try {
        await savePledge(userId, timestamp, requestBody);
        //saving pledge was successfull, return appropriate json
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
      return errorResponse(
        500,
        'Error while getting user from users table',
        error
      );
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const savePledge = (userId, timestamp, requestBody) => {
  //check which pledge it is (e.g. pledgeId='brandenburg-1')
  //create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(requestBody.pledgeId);

  const data = {
    //needs to be array because append_list works with an array
    ':pledge': [
      {
        signatureCount: requestBody.signatureCount,
        campaign: campaign,
        createdAt: timestamp,
      },
    ],
    ':zipCode': 'zipCode' in requestBody ? requestBody.zipCode : 'empty',
    ':username':
      'name' in requestBody && requestBody.name !== ''
        ? requestBody.name
        : 'empty',
    ':referral': 'referral' in requestBody ? requestBody.referral : 'empty',
    ':newsletterConsent': {
      value: requestBody.newsletterConsent,
      timestamp: timestamp,
    },
    ':emptyList': [],
  };

  //if there is no pledges key yet we initiate it with an array,
  //otherwise we add the pledge to the array
  //also we do not want to overwrite everything else, if those keys already exist
  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: userId },
      UpdateExpression: `
      set pledges = list_append(if_not_exists(pledges, :emptyList), :pledge),
      zipCode = if_not_exists(zipCode, :zipCode),
      username = if_not_exists(username, :username),
      referral = if_not_exists(referral, :referral),
      newsletterConsent = if_not_exists(newsletterConsent, :newsletterConsent)
      `,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const toUrlString = buffer => {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const validateParams = requestBody => {
  return (
    'userId' in requestBody &&
    'signatureCount' in requestBody &&
    'newsletterConsent' in requestBody
  );
};

const getUser = userId => {
  return ddb
    .get({
      TableName: tableName,
      Key: {
        cognitoId: userId,
      },
    })
    .promise();
};

const errorResponse = (statusCode, message, error) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message: message,
      error: error,
    });
  } else {
    body = JSON.stringify({
      message: message,
    });
  }
  return {
    statusCode: statusCode,
    body: body,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    isBase64Encoded: false,
  };
};

const constructCampaignId = campaignCode => {
  const campaign = {};
  if (typeof campaignCode !== 'undefined') {
    //we want to remove the last characters from the string (brandenburg-2 -> brandenburg)
    campaign.state = campaignCode.substring(0, campaignCode.length - 2);
    //...and take the last char and save it as number
    campaign.round = parseInt(
      campaignCode.substring(campaignCode.length - 1, campaignCode.length)
    );
    campaign.code = campaignCode;
  }
  return campaign;
};
