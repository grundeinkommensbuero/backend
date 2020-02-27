const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES({ region: 'eu-central-1' });

const htmlMail = require('./mailTemplate.html').default;

const CAMPAIGN_SHORTS = {
  'schleswig-holstein-1': 'sh',
  'brandenburg-1': 'bb',
  'berlin-1': 'be',
  'hamburg-1': 'hh',
  'bremen-1': 'hb',
};

// Function which sends an email to remind user to send signature lists
const sendMail = ({ email, username, cognitoId }, campaignCode) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Erinnerung: Schick uns deine Unterschriftenliste!',
    html: customMail(cognitoId, username, campaignCode),
    to: email,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

// construct an email with the passed username
const customMail = (userId, username, campaignCode) => {
  let greeting;

  //if there is a username we want to have a specific greeting
  //username might be in different forms, definitely need to refactor
  if (typeof username !== 'undefined') {
    greeting = `Hallo ${username},`;
  } else {
    greeting = 'Hallo,';
  }

  return htmlMail
    .replace(/\[\[CUSTOM_GREETING\]\]/gi, greeting)
    .replace(/\[\[USER_ID\]\]/gi, userId)
    .replace(/\[\[CAMPAIGN_SHORT\]\]/gi, CAMPAIGN_SHORTS[campaignCode]);
};

module.exports = sendMail;
