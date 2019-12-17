const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES({ region: 'eu-central-1' });
const fs = require('fs');

const htmlMail = fs.readFileSync('./mailTemplate.html', 'utf8');

//Function which sends an email to congratulate for the reception of list(s)
//gets a user object, which is why we destructure the object
const sendMail = ({ email, username, dailyCount, totalCount }) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Glückwunsch!',
    html: customMail(dailyCount, totalCount, username),
    to: email,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

//construct an email depending on the signature count
const customMail = (dailyCount, totalCount, username) => {
  let customSentence;
  let greeting;

  //if there is a username we want to have a specific greeting
  //username might be in different forms, definitely need to refactor
  if (typeof username !== 'undefined' && username !== 'empty') {
    greeting = `Hallo ${username},`;
  } else {
    greeting = 'Hallo,';
  }

  //if the total count is different than the daily count
  //we are going to send a different text in the mail
  if (totalCount > dailyCount) {
    customSentence = `Wir haben heute nochmal ${dailyCount} Unterschriften von dir erhalten. 
    Also haben wir insgesamt schon ${totalCount} Unterschriften von dir.`;
  } else {
    customSentence = `Wir haben heute ${dailyCount} Unterschriften von dir erhalten.`;
  }

  return htmlMail
    .replace(/\[\[CUSTOM_GREETING\]\]/gi, greeting)
    .replace(/\[\[CUSTOM_SENTENCE\]\]/gi, customSentence);
};

module.exports = sendMail;
