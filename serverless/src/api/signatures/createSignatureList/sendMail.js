const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE_ID_DEFAULT = 1549991;
const TEMPLATE_ID_BB_PLATFORM = 1596886;

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
  dibb: 'Brandenburg',
  democracy: 'Berlin',
};

// Functions which sends an email with the attached pdf and returns a promise
const sendMail = (email, userId, username, attachments, campaign) => {
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
          userId,
          campaign:
            campaign.state === 'berlin'
              ? 'Volksentscheid Grundeinkommen'
              : 'Demokratie für Alle',
        },
        Attachments: attachments,
      },
    ],
  };

  console.log('params', JSON.stringify(params));
  return mailjet.post('send', { version: 'v3.1' }).request(params);
};

module.exports = sendMail;
