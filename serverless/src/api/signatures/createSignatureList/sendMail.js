const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

const ses = new AWS.SES();
const htmlMail = require('raw-loader!../../../../mails/transactional/signatureListMail.html')
  .default;

let mailjet;

const { apiKey, apiSecret } = require('../../../../mailjetConfig');

// Mailjet config should only be provided optionally
if (apiKey && apiSecret) {
  mailjet = require('node-mailjet').connect(apiKey, apiSecret);
} else {
  console.log('No mailjet config provided');
}

const TEMPLATE_ID_DEFAULT = 1549991;
const TEMPLATE_ID_BB_PLATFORM = 1596886;

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
  dibb: 'Brandenburg',
};

// Functions which sends an email with the attached pdf and returns a promise
const sendMail = (email, username, attachments, campaign) => {
  // If the backend is for expedition grundeinkommen we use
  // mailjet as email provider
  if (process.env.IS_XBGE) {
    return sendMailViaMailjet(email, username, attachments, campaign);
  }

  // Otherwise we use SES
  return sendMailViaSes(email, attachments, campaign);
};

const sendMailViaMailjet = (email, username, attachments, campaign) => {
  const params = {
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID:
          campaign.code === 'dibb-1'
            ? TEMPLATE_ID_BB_PLATFORM
            : TEMPLATE_ID_DEFAULT,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username: username || '',
          state: STATES[campaign.state],
        },
        Attachments: attachments,
      },
    ],
  };

  return mailjet.post('send', { version: 'v3.1' }).request(params);
};

const sendMailViaSes = (email, attachments) => {
  if (!htmlMail) {
    throw new Error('Html Mail not provided');
  }

  const mailOptions = {
    from: 'TODO <support@expedition-grundeinkommen.de',
    subject: 'Deine Unterschriftenliste',
    html: htmlMail,
    to: email,
    // We need to bring the attachments into a different format for nodemailer
    attachments: attachments.map(attachment => ({
      filename: attachment.Filename,
      contentType: attachment.ContentType,
      content: attachment.Base64Content,
    })),
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

module.exports = sendMail;
