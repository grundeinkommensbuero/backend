const AWS = require('aws-sdk');
// const sendMail = require('./sendMail');
const { errorResponse } = require('../../../shared/apiResponse');
const { constructCampaignId } = require('../../../shared/utils');
const {
  getUserByMail,
  createUserInCognito,
  confirmUserInCognito,
} = require('../../../shared/users');

const ddb = new AWS.DynamoDB.DocumentClient();
const usersTableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const stateToAgs = {
  berlin: '11000000',
  bremen: '04011000',
  hamburg: '02000000',
};

module.exports.handler = async event => {
  try {
    // get email from body,
    const { email, campaignCode, extraInfo } = JSON.parse(event.body);

    const lowercaseEmail = email.toLowerCase();

    // if the listId is somehow undefined or null return error
    if (typeof email === 'undefined' || typeof campaignCode === 'undefined') {
      return errorResponse(
        400,
        'Email or campaign code not provided in request'
      );
    }

    // proceed by creating user
    try {
      const created = await createUserInCognito(lowercaseEmail);
      const userId = created.User.Username;

      // confirm user (by setting fake password)
      await confirmUserInCognito(userId);

      // now create dynamo resource
      await createUserInDynamo(userId, lowercaseEmail, campaignCode, extraInfo);

      try {
        // send email to to user to welcome them
        // TODO: reactivate sending of email
        // await sendMail(email, campaignCode, userId);

        // return message (created)
        return {
          statusCode: 201,
          headers: responseHeaders,
          isBase64Encoded: false,
          body: JSON.stringify({ userId }),
        };
      } catch (error) {
        console.log('Error while sending email', error);
        return errorResponse(500, 'Error while sending email', error);
      }
    } catch (error) {
      console.log('error', error);

      // user already exists
      if (error.code === 'UsernameExistsException') {
        try {
          const result = await getUserByMail(email);
          const user = result.Items[0];

          // if not, we want to update the user
          await updateNewsletterSettings(user, campaignCode, extraInfo);

          return errorResponse(
            200,
            'User existed, updated newsletter settings'
          );
        } catch (newsletterError) {
          console.log(
            'Error while (maybe) updating newsletter consent',
            newsletterError
          );
          return errorResponse(
            500,
            'Error while (maybe) updating newsletter consent',
            error
          );
        }
      }

      // invalid email
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid email', error);
      }

      return errorResponse(500, 'Error while creating user', error);
    }
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const createUserInDynamo = (userId, email, campaignCode, extraInfo) => {
  const timestamp = new Date().toISOString();
  // create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(campaignCode);

  const params = {
    TableName: usersTableName,
    Item: {
      cognitoId: userId,
      email,
      createdAt: timestamp,
      newsletterConsent: {
        value: true,
        timestamp,
      },
      customNewsletters: [
        {
          name: capitalizeState(campaign.state),
          value: true,
          extraInfo,
          timestamp,
          ags: stateToAgs[campaign.state],
        },
      ],
      migrated: {
        source: 'offline',
        campaign,
      },
    },
  };

  return ddb.put(params).promise();
};

// Update existing user to set or alter newsletter settings
const updateNewsletterSettings = (user, campaignCode, extraInfo) => {
  const timestamp = new Date().toISOString();

  const customNewsletters = user.customNewsletters || [];

  const campaign = constructCampaignId(campaignCode);

  const index = customNewsletters.findIndex(
    newsletter => newsletter.name.toLowerCase() === campaign.state
  );

  if (index !== -1) {
    if (!customNewsletters[index].value) {
      customNewsletters[index].value = true;
      customNewsletters[index].timestamp = timestamp;
    }
  } else {
    customNewsletters.push({
      name: capitalizeState(campaign.state),
      value: true,
      extraInfo,
      timestamp,
      ags: stateToAgs[campaign.state],
    });
  }

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression:
      'SET customNewsletters = :customNewsletters, newsletterConsent = :newsletterConsent',
    ExpressionAttributeValues: {
      ':customNewsletters': customNewsletters,
      ':newsletterConsent': { value: true, timestamp },
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

const capitalizeState = state => {
  const stringSplit = state.split('-');
  if (stringSplit.length > 1) {
    return `${capitalize(stringSplit[0])}-${capitalize(stringSplit[1])}`;
  }

  return `${capitalize(stringSplit[0])}`;
};

const capitalize = string => {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
};
