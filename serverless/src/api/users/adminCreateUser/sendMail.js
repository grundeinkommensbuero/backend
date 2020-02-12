const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES({ region: 'eu-central-1' });
const fs = require('fs');

const htmlMail = fs.readFileSync(__dirname + '/mailTemplate.html', 'utf8');

const CAMPAIGN_SLUGS = {
  'schleswig-holstein-1': 'schleswig-holstein',
  'brandenburg-1': 'brandenburg',
  'berlin-1': 'berlin',
  'hamburg-1': 'hamburg',
  'bremen-1': 'bremen',
  'berlin-0': 'berlin',
};

const STATES = {
  'schleswig-holstein-1': 'Schleswig-Holstein',
  'brandenburg-1': 'Brandenburg',
  'berlin-1': 'Berlin',
  'hamburg-1': 'Hamburg',
  'bremen-1': 'Bremen',
  'berlin-0': 'Berlin',
};

//Function which sends an email to welcome the user to our expedition
const sendMail = (email, campaignCode, userId) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Danke für deine Unterschrift!',
    html: htmlMail
      .replace(/\[\[CAMPAIGN_CODE\]\]/gi, campaignCode)
      .replace(/\[\[CAMPAIGN_SLUG\]\]/gi, CAMPAIGN_SLUGS[campaignCode])
      .replace(/\[\[STATE\]\]/gi, STATES[campaignCode])
      .replace(/\[\[USER_ID\]\]/gi, userId),
    to: email,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

module.exports = sendMail;
