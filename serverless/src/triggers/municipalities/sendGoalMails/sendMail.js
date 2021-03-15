const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE_50 = 2387952;
const TEMPLATE_GOAL = 2388043;

const END_OF_QUALIFYING_PERIOD = '03-21-2021 18:00:00';

const sendMail = (
  { email, username, cognitoId: userId },
  municipality,
  event,
  ratio
) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: event === '50' ? TEMPLATE_50 : TEMPLATE_GOAL,
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
          percentToGoal: Math.round(ratio * 100),
        },
      },
    ],
  });
};

// Compute the difference between today and the end of the qualifying period
const computeDaysRemaining = () => {
  return Math.round(
    (new Date(END_OF_QUALIFYING_PERIOD) - new Date()) / (1000 * 60 * 60 * 24)
  );
};

module.exports = sendMail;
