/**
 * This mail will run every day and check if new users have signed up
 * for a municipality. Those users will receive an email.
 */

const { sendErrorMail } = require('../../../shared/errorHandling');
const {
  getAllMunicipalitiesWithUsers,
  getMunicipality,
} = require('../../../shared/municipalities');
const { getUser } = require('../../../shared/users');

const sendMail = require('./sendMail');

const ONE_DAY = 24 * 60 * 60 * 1000;

module.exports.handler = async event => {
  try {
    // Get all user municipality links of the last day (all users who have signed up for a municipality)
    const userMunicipalityLinks = await getAllMunicipalitiesWithUsers(
      new Date(new Date() - ONE_DAY).toISOString()
    );

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
  for (const { userId, ags } of userMunicipalityLinks) {
    // Get user record from users table to get email, username etc
    const userResult = await getUser(userId);

    // Get municipality record to get municipality name
    const municipalityResult = await getMunicipality(ags);

    // Only send the email if user still exists and is a new user (created after launch)
    // and has newsletter consent
    if (
      'Item' in userResult &&
      userWasCreatedAfterLaunch(userResult.Item) &&
      userResult.Item.newsletterConsent.value &&
      'Item' in municipalityResult
    ) {
      await sendMail(userResult.Item, municipalityResult.Item);
      console.log('sent mail to', userResult.Item.email);
    }
  }
};

const userWasCreatedAfterLaunch = user => {
  return new Date(user.createdAt) > new Date('2021-02-22');
};
