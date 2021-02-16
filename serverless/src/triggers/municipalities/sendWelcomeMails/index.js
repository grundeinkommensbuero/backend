/**
 * This mail will run every day and check if new users have signed up
 * for a municipality. Those users will receive an email.
 */

const AWS = require('aws-sdk');
const { sendErrorMail } = require('../../../shared/errorHandling');
const {
  getAllMunicipalitiesWithUsers,
} = require('../../../shared/municipalities');
const { getUser } = require('../../../shared/users');

const s3 = new AWS.S3();

const bucket = 'xbge-municipalities-stats';
const stage = process.env.STAGE;
const fileName = 'statsWithAll.json';
const sendMail = require('./sendMail');

const ONE_DAY = 24 * 60 * 60 * 1000;

module.exports.handler = async event => {
  try {
    // Get all user municipality links of the last day (all users who have signed up for a municipality)
    const userMunicipalityLinks = await getAllMunicipalitiesWithUsers(
      new Date(new Date() - ONE_DAY).toISOString()
    );

    // We need the stats to check if a municipality has reached goal.
    // We don't want to compute the stats again, because we already
    // do it in a cron job, so we just get the json from s3
    const json = await getJson();
    const { municipalities } = JSON.parse(json.Body.toString());

    // Send mails to all those users
    await sendMails(userMunicipalityLinks, municipalities);
  } catch (error) {
    console.log('Error sending welcome mails', error);
    await sendErrorMail('sendWelcomeMails', error);
  }

  return event;
};

// Send mails to all user who have signed up for municipality
const sendMails = async (userMunicipalityLinks, municipalities) => {
  for (const { userId, ags, wantsToBeActive } of userMunicipalityLinks) {
    // Get user record from users table to get email, username etc
    const result = await getUser(userId);

    if ('Item' in result) {
      // Get stats for this municipality
      const found = municipalities.find(
        municipality => municipality.ags === ags
      );

      const reachedGoal = found && found.signups >= found.goal;

      await sendMail(result.Item, reachedGoal, wantsToBeActive);
    }
  }
};

// Gets json file from s3
const getJson = () => {
  const params = {
    Bucket: bucket,
    Key: `${stage}/${fileName}`,
  };

  return s3.getObject(params).promise();
};
