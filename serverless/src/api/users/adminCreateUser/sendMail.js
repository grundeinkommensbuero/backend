const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES({ region: 'eu-central-1' });
const fs = require('fs');

const htmlMail = fs.readFileSync('./mailTemplate.html', 'utf8');

//Function which sends an email to welcome the user to our expedition
const sendMail = (email, campaignCode, userId) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Danke für deine Unterschrift!',
    html: htmlMail
      .replace('[[CAMPAIGN_CODE]]', campaignCode)
      .replace('[[USER_ID]]', userId),
    to: email,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

module.exports = sendMail;
