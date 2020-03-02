const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser, getUserByMail } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { constructCampaignId } = require('../../../shared/utils');
const tableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  //get user id from path parameter
  let userId = event.pathParameters.userId;
  console.log('userId', userId);
  try {
    const requestBody = JSON.parse(event.body);
    const date = new Date();
    const timestamp = date.toISOString();
    try {
      let user;
      if ('email' in requestBody) {
        //in case the api only got the email instead of the id we need to get the user id from the db
        const result = await getUserByMail(requestBody.email);

        if (result.Count === 0) {
          return errorResponse(400, 'No user found with the passed email');
        } else {
          //we later need the user object
          user = result.Items[0];
          userId = user.cognitoId;
        }
      } else {
        const result = await getUser(userId);
        //if user does not have Item as property, there was no user found
        if (!('Item' in result) || typeof result.Item === 'undefined') {
          return errorResponse(400, 'No user found with the passed user id');
        }

        user = result.Item;
      }

      // Check if newsletter consent has changed (only from no to yes)
      // if yes we want to save it in some kind of "fake" newsletter consent field
      newsletterConsentHasChanged = false;
      if ('newsletterConsent' in user && !user.newsletterConsent.value) {
        newsletterConsentHasChanged = true;
      }

      try {
        //otherwise proceed by saving the referral and saving a true newsletter consent
        await updateUser(
          userId,
          requestBody.referral,
          timestamp,
          newsletterConsentHasChanged,
          requestBody.campaignCode
        );
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

const updateUser = (
  userId,
  referral,
  timestamp,
  newsletterConsentHasChanged,
  campaignCode
) => {
  const newsletterConsent = {
    value: true,
    timestamp: timestamp,
  };
  //if referral is undefined, don't add the key
  let updateExpression;

  if (newsletterConsentHasChanged) {
    updateExpression =
      'SET changedNewsletterConsent = if_not_exists(changedNewsletterConsent, :newsletterConsent)';
  } else {
    updateExpression = 'SET newsletterConsent = :newsletterConsent';
  }

  if (typeof referral !== 'undefined') {
    updateExpression += ', referral = :referral';
  }

  let campaign;
  if (typeof campaignCode !== 'undefined') {
    campaign = constructCampaignId(campaignCode);
    updateExpression +=
      ', signatureCampaigns = list_append(if_not_exists(signatureCampaigns, :emptyList), :campaign)';
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

  if (typeof campaignCode !== 'undefined') {
    params.ExpressionAttributeValues[':emptyList'] = [];
    params.ExpressionAttributeValues[':campaign'] = [campaign];
  }

  return ddb.update(params).promise();
};
