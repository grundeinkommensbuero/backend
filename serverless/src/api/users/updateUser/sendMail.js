const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

// Function which sends an email to the user after donation was changed
const sendMail = (email, { recurring, amount, firstName, lastName, iban }) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: 1885162,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          recurring: recurring || undefined,
          amount,
          firstName,
          lastName,
          iban,
        },
      },
    ],
  });
};

module.exports = sendMail;
