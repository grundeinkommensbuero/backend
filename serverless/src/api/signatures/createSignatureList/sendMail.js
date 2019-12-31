const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES();
const fs = require('fs');

const htmlMail = fs.readFileSync(__dirname + '/mailTemplate.html', 'utf8');

//Functions which sends an email with the attached pdf and returns a promise
const sendMail = (email, attachments) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Deine Unterschriftenliste',
    html: htmlMail,
    to: email,
    attachments: attachments,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

module.exports = sendMail;
