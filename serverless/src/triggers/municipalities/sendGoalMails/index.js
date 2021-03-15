/**
 * This function should send various mails depending on the count of signups
 * for a municipality. Users will be informed, when municipalities have
 * reached 50% of the goal or the goal itself.
 */

const AWS = require('aws-sdk');
const {
  getMunicipality,
  getAllUsersOfMunicipality,
} = require('../../../shared/municipalities');
const { getUser } = require('../../../shared/users');
const sendMail = require('./sendMail');
const nodemailer = require('nodemailer');
const { sendErrorMail } = require('../../../shared/errorHandling');

const ses = new AWS.SES({ region: 'eu-central-1' });
const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB.DocumentClient();

const bucket = 'xbge-municipalities-stats';
const stage = process.env.STAGE;
const fileName = 'statsWithAll.json';
const municipalitiesTableName = process.env.MUNICIPALITIES_TABLE_NAME;

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
  for (const { signups, goal, ags, engagementLevels } of municipalities) {
    const ratio = signups / goal;
    const reached50 = ratio >= 0.5 && ratio < 1;

    // NOTE: not needed for now, will be reactivated soon
    // const reachedGoal = ratio >= 1;

    if (reached50) {
      // Now we need to check, if we have already sent a mail for this municipality
      const { Item } = await getMunicipality(ags);

      if (typeof Item !== 'undefined') {
        // We need the engagement levels to check if there are any organizers
        const municipality = { ...Item, goal, signups, engagementLevels };

        // Check if we have already set the flags for this municipality
        if (
          reached50 &&
          (!('mails' in Item) || !Item.mails.sentReached50)
          // NOTE: not needed for now, will be reactivated soon
          // || (reachedGoal && (!('mails' in Item) || !Item.mails.sentReachedGoal))
        ) {
          const event = reached50 ? '50' : 'goal';
          // Send mail to all users
          await sendMailsForMunicipality(municipality, event, ratio);

          // Set flag, that we have sent mails
          await setFlag(municipality, event);

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

  for (const { userId } of users) {
    // Get user record from users table to get email, username etc
    const result = await getUser(userId);

    if ('Item' in result) {
      await sendMail(result.Item, municipality, event, ratio);
    }
  }

  // send info mail to xbge team
  if (stage === 'prod') {
    await sendInfoMail(municipality, event);
  }
};

const setFlag = (municipality, event) => {
  let flags = {};

  if ('mails' in municipality) {
    flags = municipality.mails;
  }

  if (event === '50') {
    flags.sentReached50 = true;
  } else {
    flags.sentReachedGoal = true;
  }

  const params = {
    TableName: municipalitiesTableName,
    Key: { ags: municipality.ags },
    UpdateExpression: 'SET mails = :flags',
    ExpressionAttributeValues: {
      ':flags': flags,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

// Gets json file from s3
const getJson = () => {
  const params = {
    Bucket: bucket,
    Key: `${stage}/${fileName}`,
  };

  return s3.getObject(params).promise();
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
        ? [
            'valentin@expedition-grundeinkommen.de',
            // 'lucia@expedition-grundeinkommen.de',
            // 'laura@expedition-grundeinkommen.de',
            // 'sarah@expedition-grundeinkommen.de',
          ]
        : 'valentin@expedition-grundeinkommen.de',
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};
