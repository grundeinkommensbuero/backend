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

  console.log('params', JSON.stringify(params));
  return mailjet.post('send', { version: 'v3.1' }).request(params);
};

module.exports = sendMail;
