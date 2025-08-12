/**
 * This function should send various mails depending on the count of signups
 * for a municipality. Users will be informed, when municipalities have
 * reached 50% of the goal or the goal itself.
 */



const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { S3 } = require('@aws-sdk/client-s3');
const { SES } = require('@aws-sdk/client-ses');
const {
  getMunicipality,
  getAllUsersOfMunicipality,
} = require('../../../shared/municipalities');
const { getUser } = require('../../../shared/users');
const sendMail = require('./sendMail');
const nodemailer = require('nodemailer');
const { sendErrorMail } = require('../../../shared/errorHandling');

const ses = new SES({
  region: 'eu-central-1',
});
const s3 = new S3();
const ddb = DynamoDBDocument.from(new DynamoDB());

const bucket = 'xbge-municipalities-stats';
const stage = process.env.STAGE;
const fileName = 'statsWithAll.json';
const userMunicipalityTableName = process.env.USER_MUNICIPALITY_TABLE_NAME;
const municipalitiesTableName = process.env.MUNICIPALITIES_TABLE_NAME;
const FOURTY_HOURS = 40 * 60 * 60 * 1000;

// Munic to test: 01051014

module.exports.handler = async event => {
  try {
    // We don't want to compute the stats again, because we already
    // do it in a cron job, so we just get the json from s3
    const json = await getJson();
    const { municipalities } = JSON.parse(json.Body.toString());

    // Check which municipalities have reached goals and
    // send emails to all users
    await analyseMunicipalities(municipalities);
  } catch (error) {
    console.log('Error sending mails', error);
    await sendErrorMail('sendGoalMails', error);
  }

  return event;
};

// Loops through municipalities and checks if municipalities are
// over 50% of the goal and have reached goal (the latter is deactivated for now)
const analyseMunicipalities = async municipalities => {
  for (const { signups, goal, ags } of municipalities) {
    const ratio = signups / goal;
    const reached50 = ratio >= 0.5 && ratio < 1;
    const reachedGoal = ratio >= 1;

    if (reached50 || reachedGoal) {
      // Get municipality to get name
      const { Item } = await getMunicipality(ags);

      if (typeof Item !== 'undefined') {
        const municipality = { ...Item, goal, signups };

        const event = reached50 ? '50' : 'goal';

        if (
          stage === 'prod' ||
          (stage === 'dev' && (ags === '14628230' || ags === '14713000'))
        ) {
          // Send mail to all users
          await sendMailsForMunicipality(municipality, event, ratio);

          console.log('sent mails for municipality', municipality);
        }
      } else {
        console.log('No municipality found with ags', ags);
      }
    }
  }
};

// Send mail to all users of this municipality
const sendMailsForMunicipality = async (municipality, event, ratio) => {
  // First we have to get all users of this municipality
  const users = await getAllUsersOfMunicipality(municipality.ags);

  for (const { userId, mails, createdAt } of users) {
    // Get user record from users table to get email, username etc
    const result = await getUser(userId);

    // Check if we have already set the flag (depending on the event) for this user
    // and user still exists.
    // And we also want to only send the email, if the user signed up for the municipality
    // more than 40 hours ago, so that the user does not receive the welcome mail
    // and goal mail too soon after one another
    if (
      'Item' in result &&
      result.Item.newsletterConsent.value &&
      (typeof mails === 'undefined' ||
        (event === '50' && !mails.sentReached50) ||
        (event === 'goal' && !mails.sentReachedGoal)) &&
      new Date() - new Date(createdAt) > FOURTY_HOURS
    ) {
      await sendMail(result.Item, municipality, event, ratio);

      // Set flag, that we have sent mails
      await setFlag(municipality.ags, userId, mails, event);
    }
  }

  // send info mail to xbge team
  // NOTE: this does not make sense anymore, because the email is sent
  // every time now, because we set the flag for users and not for the municipality anymore
  if (event === 'goal' && !municipality.sentMailToTeam) {
    await sendInfoMail(municipality, event);

    await setSentToTeamFlag(municipality.ags);
  }
};

const setFlag = (ags, userId, mails, event) => {
  const flags = mails || {};

  if (event === '50') {
    flags.sentReached50 = true;
  } else {
    flags.sentReachedGoal = true;
  }

  const params = {
    TableName: userMunicipalityTableName,
    Key: {
      ags,
      userId,
    },
    UpdateExpression: 'SET mails = :flags',
    ExpressionAttributeValues: {
      ':flags': flags,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params);
};

const setSentToTeamFlag = ags => {
  const params = {
    TableName: municipalitiesTableName,
    Key: {
      ags,
    },
    UpdateExpression: 'SET sentMailToTeam = :flag',
    ExpressionAttributeValues: {
      ':flag': true,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params);
};

// Gets json file from s3
const getJson = () => {
  const params = {
    Bucket: bucket,
    Key: `${stage}/${fileName}`,
  };

  return s3.getObject(params);
};

// Send info mail to xbge Team (we just use ses here, because we don't need
// a mailjet template and this is just easier)
const sendInfoMail = (municipality, event) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject:
      event === '50'
        ? `Die Gemeinde ${municipality.name} hat 50% erreicht`
        : `Die Gemeinde ${municipality.name} hat das Ziel erreicht`,
    html: `Es wurden Mails an die User:innen aus ${
      municipality.name
    } verschickt, da die Gemeinde ${
      event === '50' ? '50% des Ziels erreicht hat' : 'das Ziel erreicht hat'
    }. Die Gemeinde hat ${municipality.signups} von ${
      municipality.goal
    } erreicht.`,
    to:
      stage === 'prod'
        ? 'team@expedition-grundeinkommen.de'
        : 'valentin@expedition-grundeinkommen.de',
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};
