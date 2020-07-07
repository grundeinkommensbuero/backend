const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
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
        TemplateID: 1549991,
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
