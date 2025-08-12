const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const sendMail = require('./sendMail');
const { errorResponse } = require('../../../shared/apiResponse');
const { constructCampaignId } = require('../../../shared/utils');
const {
  getUserByMail,
  createUserInCognito,
  confirmUserInCognito,
} = require('../../../shared/users');
const {
  getUserMunicipalityLink,
  createUserMunicipalityLink,
} = require('../../../shared/municipalities');

const ddb = DynamoDBDocument.from(new DynamoDB());
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

const stateToPopulation = {
  berlin: 3669491,
  bremen: 567559,
  hamburg: 1847253,
};

module.exports.handler = async event => {
  try {
    // get email from body,
    const { emails, campaignCode, extraInfo } = JSON.parse(event.body);

    // create a (nice to later work with) object, which campaign it is
    const campaign = constructCampaignId(campaignCode);
    const ags = stateToAgs[campaign.state];

    if (typeof emails === 'undefined' || typeof campaignCode === 'undefined') {
      return errorResponse(
        400,
        'Email or campaign code not provided in request'
      );
    }

    let responseMessage = '';

    // proceed by creating users
    for (const email of emails) {
      try {
        const lowercaseEmail = email.toLowerCase();

        const created = await createUserInCognito(lowercaseEmail);
        const userId = created.User.Username;

        // confirm user (by setting fake password)
        await confirmUserInCognito(userId);

        // now create dynamo resource
        await createUserInDynamo(
          userId,
          lowercaseEmail,
          campaignCode,
          extraInfo
        );

        if (typeof ags !== 'undefined') {
          await createUserMunicipalityLink(
            ags,
            userId,
            stateToPopulation[campaign.state]
          );
        }

        responseMessage += `${email} wurde hinzugefügt.\n`;

        // send email to to user to welcome them
        // TODO: reactivate sending of email for other campaigns
        // try {
        //    await sendMail(lowercaseEmail, userId, extraInfo);
        // } catch (error) {
        //   console.log('Error while sending email', error);
        //   return errorResponse(500, 'Error while sending email', error);
        // }
      } catch (error) {
        console.log('error', error);

        // user already exists
        if (error.code === 'UsernameExistsException') {
          try {
            const result = await getUserByMail(email);
            const user = result.Items[0];
            const userId = user.cognitoId;

            // if not, we want to update the user
            await updateNewsletterSettings(user, campaignCode, extraInfo);

            // Query user municipality table to check if user has already signed up for this munic
            const userMunicipalityResult = await getUserMunicipalityLink(
              ags,
              userId
            );

            // If user has not already signed up for municipality...
            if (!('Item' in userMunicipalityResult)) {
              await createUserMunicipalityLink(
                ags,
                userId,
                stateToPopulation[campaign.state]
              );
            }

            responseMessage += `${email} existiert schon. Daten wurden, falls notwendig, angepasst.\n`;
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
        } else if (error.code === 'InvalidParameterException') {
          // invalid email
          return errorResponse(400, 'Invalid email', error);
        } else {
          return errorResponse(500, 'Error while creating user', error);
        }
      }
    }

    // return message (created)
    return {
      statusCode: 200,
      headers: responseHeaders,
      isBase64Encoded: false,
      body: JSON.stringify({ message: responseMessage }),
    };
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const createUserInDynamo = (userId, email, campaignCode, extraInfo) => {
  const timestamp = new Date().toISOString();
  // create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(campaignCode);
  const ags = stateToAgs[campaign.state];

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
      confirmed: {
        value: true,
        timestamp,
      },
      migrated: {
        source: 'offline',
        campaign,
      },
    },
    removeUndefinedValues: true,
  };

  if (typeof ags !== 'undefined') {
    params.Item.customNewsletters = [
      {
        name: capitalizeState(campaign.state),
        value: true,
        extraInfo,
        timestamp,
        ags,
      },
    ];
  }

  return ddb.put(params);
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

    if (extraInfo) {
      customNewsletters[index].extraInfo = true;
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

  return ddb.update(params);
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
