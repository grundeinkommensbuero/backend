const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

const { getUser, getUserByMail } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { constructCampaignId } = require('../../../shared/utils');

const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    try {
      //check if there is a user with the passed user id
      const date = new Date();
      const timestamp = date.toISOString();
      console.log('request body', requestBody);

      if (!validateParams(requestBody)) {
        return errorResponse(400, 'One or more parameters are missing');
      }

      //request body might have email or user id
      let userId;
      let user;
      if ('userId' in requestBody) {
        userId = requestBody.userId;
        try {
          const result = await getUser(userId);

          console.log('user', result);
          //if user does not have Item as property, there was no user found
          if (!('Item' in result) || typeof result.Item === 'undefined') {
            return errorResponse(400, 'No user found with the passed user id');
          }

          //we later need the user object
          user = result.Item;
        } catch (error) {
          return errorResponse(500, 'Error while getting user', error);
        }
      } else if ('email' in requestBody) {
        //in case the api only got the email instead of the id we need to get the user id from the db
        try {
          const result = await getUserByMail(requestBody.email);

          if (result.Count === 0) {
            return errorResponse(400, 'No user found with the passed email');
          } else {
            //we later need the user object and id
            user = result.Items[0];
            userId = user.cognitoId;
          }
        } catch (error) {
          return errorResponse(500, 'Error while getting user by email', error);
        }
      }

      let pledgeWasAlreadyMade = false;

      // check if the same pledge was already made
      if ('pledges' in user) {
        for (let pledge of user.pledges) {
          if (requestBody.pledgeId === pledge.campaign.code) {
            pledgeWasAlreadyMade = true;
          }
        }
      }

      // Check if newsletter consent has changed (only from no to yes)
      // if yes we want to save it in some kind of "fake" newsletter consent field
      newsletterConsentHasChanged = false;
      if (
        'newsletterConsent' in user &&
        !user.newsletterConsent.value &&
        requestBody.newsletterConsent
      ) {
        newsletterConsentHasChanged = true;
      }

      //if no pledge for this specific campaign was made, proceed...
      try {
        await savePledge(
          userId,
          timestamp,
          requestBody,
          pledgeWasAlreadyMade,
          newsletterConsentHasChanged
        );

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
      return errorResponse(500, 'Non-specific error', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const savePledge = (
  userId,
  timestamp,
  requestBody,
  pledgeWasAlreadyMade,
  newsletterConsentHasChanged
) => {
  console.log('pledge was already made', pledgeWasAlreadyMade);
  //check which pledge it is (e.g. pledgeId='brandenburg-1')
  //create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(requestBody.pledgeId);

  const pledge = {
    campaign: campaign,
    createdAt: timestamp,
    abTestId: requestBody.abTestId,
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
    ':newsletterConsent': {
      value: requestBody.newsletterConsent,
      timestamp: timestamp,
    },
  };

  // The following parameters are iptional
  if ('zipCode' in requestBody) {
    data[':zipCode'] = requestBody.zipCode;
  }

  if ('name' in requestBody) {
    data[':username'] = requestBody.name;
  }

  if ('referral' in requestBody) {
    data[':referral'] = requestBody.referral;
  }

  // If city is the request body we add it (is the case for general pledge)
  if ('city' in requestBody && requestBody.city !== '') {
    data[':city'] = requestBody.city;
  }

  if (!pledgeWasAlreadyMade) {
    data[':emptyList'] = [];
    //needs to be array because append_list works with an array
    data[':pledge'] = [pledge];
  }

  // if there is no pledges key yet we initiate it with an array,
  // otherwise we add the pledge to the array (if the specific pledge does not yet exist).
  // Also we do not want to overwrite everything else, if those keys already exist.
  // If the newsletter consent changed from no to yes we want to save it
  const updateExpression = `set 
  ${
    !pledgeWasAlreadyMade
      ? 'pledges = list_append(if_not_exists(pledges, :emptyList), :pledge),'
      : ''
  }${
    newsletterConsentHasChanged
      ? 'changedNewsletterConsent = if_not_exists(changedNewsletterConsent, :newsletterConsent),'
      : ''
  }
  ${':city' in data ? 'city = if_not_exists(city, :city),' : ''}
  ${':zipCode' in data ? 'zipCode = if_not_exists(zipCode, :zipCode),' : ''}
  ${':username' in data ? 'username = if_not_exists(username, :username),' : ''}
  ${':referral' in data ? 'referral = if_not_exists(referral, :referral),' : ''}
  newsletterConsent = if_not_exists(newsletterConsent, :newsletterConsent)
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

const validateParams = requestBody => {
  return (
    ('userId' in requestBody || 'email' in requestBody) &&
    'newsletterConsent' in requestBody
  );
};
