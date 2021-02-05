const { apiKey, apiSecret } = require('../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE_80 = 'TODO';
const TEMPLATE_GOAL = 'TODO';

const sendMail = ({ email, username }, municipality, event) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: event === '80' ? TEMPLATE_80 : TEMPLATE_GOAL,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
        },
      },
    ],
  });
};

module.exports = sendMail;
