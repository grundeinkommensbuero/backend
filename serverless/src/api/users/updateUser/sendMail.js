let mailjet;

const { apiKey, apiSecret } = require('../../../../mailjetConfig');

// Mailjet config should only be provided optionally
if (apiKey && apiSecret) {
  mailjet = require('node-mailjet').connect(apiKey, apiSecret);
} else {
  console.log('No mailjet config provided');
}

// Function which sends an email to the user after donation was changed
const sendMail = (
  email,
  { recurring, amount, firstName, lastName, iban },
  recurringDonationExisted
) => {
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
          recurring,
          recurringDonationExisted,
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
