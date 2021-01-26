const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

const ses = new AWS.SES();
const htmlMail = require('raw-loader!../../../mails/transactional/congratulationMail.html')
  .default;

let mailjet;

const { apiKey, apiSecret } = require('../../../mailjetConfig');

// Mailjet config should only be provided optionally
if (apiKey && apiSecret) {
  mailjet = require('node-mailjet').connect(apiKey, apiSecret);
} else {
  console.log('No mailjet config provided');
}

const GOALS = {
  'schleswig-holstein-1': '24000',
  'brandenburg-1': '24000',
  'hamburg-1': '12000',
  'bremen-1': '5000',
  'berlin-1': '24000',
};

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
};

// Function which sends an email to congratulate for the reception of list(s)
// gets a user object, which is why we destructure the object
const sendMail = (user, totalCountForAllUsers) => {
  // If the backend is for expedition grundeinkommen we use
  // mailjet as email provider
  if (process.env.IS_XBGE) {
    return sendMailViaMailjet(user, totalCountForAllUsers);
  }

  // Otherwise we use SES
  return sendMailViaSes();
};

const sendMailViaMailjet = (
  { email, username, userId, dailyCount, totalCount, campaign, pdfUrl },
  totalCountForAllUsers
) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: 1480788,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          dailyCount,
          totalCount,
          totalCountGreater5: totalCount > 5,
          userId,
          campaignCode: campaign.code,
          totalCountForAllUsers,
          totalCountGoal: GOALS[campaign.code],
          state: STATES[campaign.state],
          pdfUrl,
        },
      },
    ],
  });
};

const sendMailViaSes = ({ email, ...user }, totalCountForAllUsers) => {
  const mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    subject: 'Deine Spendeneinstellungen haben sich geändert',
    html: customEmail(user, totalCountForAllUsers),
    to: email,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

// TODO: the download list link still needs the correct url
const customEmail = (
  { userId, dailyCount, totalCount },
  totalCountForAllUsers
) => {
  if (!htmlMail) {
    throw new Error('Html Mail not provided');
  }

  return htmlMail
    .replace(/\[\[DAILY_COUNT\]\]/gi, dailyCount)
    .replace(/\[\[TOTAL_COUNT\]\]/gi, totalCount)
    .replace(/\[\[TOTAL_COUNT_ALL_USERS\]\]/gi, totalCountForAllUsers)
    .replace(/\[\[USER_ID\]\]/gi, userId);
};

module.exports = sendMail;
