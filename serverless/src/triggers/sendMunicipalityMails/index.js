/**
 * This function should send various mails depending on the count of signups
 * for a municipality.
 */

const AWS = require('aws-sdk');
const {
  getMunicipality,
  getAllUsersOfMunicipality,
} = require('../../shared/municipalities');
const sendMail = require('./sendMail');

const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB.DocumentClient();

const bucket = 'xbge-municipalities-stats';
const stage = process.env.STAGE;
const fileName = 'statsWithAll.json';
const municipalitiesTableName = process.env.MUNICIPALITIES_TABLE_NAME;

module.exports.handler = async event => {
  // We don't want to compute the stats again, because we already
  // do it in a cron job, so we just get the json from s3
  const json = await getJson();
  const { municipalities } = JSON.parse(json.Body.toString());

  // Check which municipalities have reached goals and
  // send emails to all users
  await analyseMunicipalities(municipalities);

  return event;
};

// Loops through municipalities and checks if municipalities are
// over 80% of the goal and  have reached goal
const analyseMunicipalities = async municipalities => {
  for (const { signups, goal, ags } of municipalities) {
    const ratio = signups / goal;

    if (ratio >= 0.8 && ratio < 1) {
      // Now we need to check, if we have already sent a mail for this municipality
      const { Item } = await getMunicipality(ags);

      if (!Item.mails.sentReached80) {
        // Send mail to all users
        await sendMailsForMunicipality(Item, '80');

        // Set flag, that we have sent mails
        await setFlag(Item.ags, '80');
      }
    } else if (ratio >= 1) {
      // Now we need to check, if we have already sent a mail for this municipality
      const { Item } = await getMunicipality(ags);

      if (!Item.mails.sentReachedGoal) {
        // Send mail to all users
        await sendMailsForMunicipality(Item, 'goal');

        // Set flag, that we have sent mails
        await setFlag(Item.ags, 'goal');
      }
    }
  }
};

// Send mail to all users of this municipality
const sendMailsForMunicipality = async (municipality, event) => {
  // First we have to get all users of this municipality
  const users = await getAllUsersOfMunicipality(municipality.ags);

  for (const user of users) {
    await sendMail(user, municipality, event);
  }

  // TODO: send info mail to xbge team
};

const setFlag = (ags, event) => {
  const params = {
    TableName: municipalitiesTableName,
    Key: { ags },
    UpdateExpression: 'SET #key := true',
    ExpressionAttributeNames: {
      '#key': event === '80' ? 'mails.sentReached80' : 'mails.sentReachedGoal',
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
