const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES({ region: 'eu-central-1' });
const fs = require('fs');

const htmlMail = fs.readFileSync(__dirname + '/mailTemplate.html', 'utf8');

// Function which sends an email to remind user to send signature lists
const sendMail = ({ email, username }) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: `Schick mal deine Liste!`,
    html: customMail(username),
    to: email,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

// construct an email with the passed username
const customMail = username => {
  let greeting;

  //if there is a username we want to have a specific greeting
  //username might be in different forms, definitely need to refactor
  if (typeof username !== 'undefined' && username !== 'empty') {
    greeting = `Hallo ${username},`;
  } else {
    greeting = 'Hallo,';
  }

  return htmlMail.replace(/\[\[CUSTOM_GREETING\]\]/gi, greeting);
};

module.exports = sendMail;
