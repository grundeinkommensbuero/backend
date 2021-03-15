const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE = 2617393;
const END_OF_QUALIFYING_PERIOD = '2021-03-21 18:00:00';

const sendMail = ({ username, email, cognitoId: userId }, municipality) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: TEMPLATE,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          userId,
          daysRemaining: computeDaysRemaining(),
          municipalityName: municipality.name,
          // Event section should only be shown before the 18th of march.
          // Pass strings cause mailjet handles boolean weirdly.
          showEvents: new Date() < new Date('2021-03-19') ? 'yes' : 'no',
        },
      },
    ],
  });
};

module.exports = sendMail;

// Compute the difference between today and the end of the qualifying period
const computeDaysRemaining = () => {
  return Math.round(
    (new Date(END_OF_QUALIFYING_PERIOD) - new Date()) / (1000 * 60 * 60 * 24)
  );
};
