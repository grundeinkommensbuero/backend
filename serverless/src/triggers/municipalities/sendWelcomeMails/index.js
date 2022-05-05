/**
 * This mail will run every day and check if new users have signed up
 * for a municipality. Those users will receive an email.
 * Also includes the C flow for Berlin user journey.
 */

const AWS = require('aws-sdk');
const { sendErrorMail } = require('../../../shared/errorHandling');
const {
  getAllMunicipalitiesWithUsers,
  getMunicipality,
} = require('../../../shared/municipalities');
const { getSignatureListsOfUser } = require('../../../shared/signatures');
const { getUser } = require('../../../shared/users');
const { computeMailType } = require('./computeMailType');
const sendMail = require('./sendMail');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const usersTableName = process.env.USERS_TABLE_NAME;

const EIGHT_DAYS = 8 * 24 * 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;
const AGS_BERLIN = '11000000';

module.exports.handler = async event => {
  try {
    // Get all user municipality links of the last 8 days (all users who have signed up for a municipality)
    // Berlin should receive the first mail after 7 days after signup, other municipalities one day
    const userMunicipalityLinks = await getAllMunicipalitiesWithUsers(
      new Date(new Date() - EIGHT_DAYS).toISOString()
    );

    console.log(userMunicipalityLinks);
    // Send mails to all those users
    await sendMails(userMunicipalityLinks);
  } catch (error) {
    console.log('Error sending welcome mails', error);
    await sendErrorMail('sendWelcomeMails', error);
  }

  return event;
};

// Send mails to all user who have signed up for municipality
const sendMails = async userMunicipalityLinks => {
  for (const { userId, ags, createdAt } of userMunicipalityLinks) {
    // Get user record from users table to get email, username etc
    const userResult = await getUser(userId);

    // Get municipality record to get municipality name
    const municipalityResult = await getMunicipality(ags);

    // Only send the email if user still exists
    // and has newsletter consent
    if (
      'Item' in userResult &&
      userResult.Item.newsletterConsent.value &&
      'Item' in municipalityResult
    ) {
      const user = userResult.Item;

      if (ags === AGS_BERLIN) {
        // C Flow of user journey

        // Check if user has already downloaded a list,
        // if yes, we don't send any more C mails
        const signatureListsResult = await getSignatureListsOfUser(
          userId,
          'berlin-2'
        );

        console.log('lists', signatureListsResult);

        if (signatureListsResult.Count === 0) {
          // If today is x days after user signed up for municipality
          // or x days after the first mail was sent, we send the email
          // or x days after the second mail, but only if user wants to be reminded
          const mailType = computeMailType(user, createdAt);

          if (mailType) {
            await Promise.all([
              sendMail(user, municipalityResult.Item, mailType),
              // We also want to update user to save the email which was sent
              updateUser(user, mailType),
            ]);
          }
        }
      } else if (new Date() - new Date(createdAt) < ONE_DAY) {
        // Other municipalities should receive the welcome mail within one day
        await sendMail(user, municipalityResult.Item);
        console.log('sent mail to', userResult.Item.email);
      }
    }
  }
};

const updateUser = (user, mailType) => {
  const timestamp = new Date().toISOString();

  const welcomeFlow = user.welcomeFlow || {};
  welcomeFlow.emailsSent = welcomeFlow.emailsSent || [];

  welcomeFlow.emailsSent.push({
    key: mailType,
    timestamp,
  });

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'SET welcomeFlow = :welcomeFlow, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':welcomeFlow': welcomeFlow,
      ':updatedAt': timestamp,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};
