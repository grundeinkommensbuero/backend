const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE_80 = 2387952;
const TEMPLATE_GOAL = 2388043;
const TEMPLATE_GOAL_NO_ORGANIZERS = 2388587;

const END_OF_QUALIFYING_PERIOD = '03-21-2021 18:00:00';
const START_OF_QUALIFYING_PERIOD = '02-23-2021 10:00:00';

const sendMail = ({ email, username }, municipality, event) => {
  let template;

  if (event === '80') {
    template = TEMPLATE_80;
  } else if (
    'engagementLevels' in municipality &&
    municipality.engagementLevels[3] > 0
  ) {
    // There are already organizers in the municipality
    template = TEMPLATE_GOAL;
  } else {
    template = TEMPLATE_GOAL_NO_ORGANIZERS;
  }

  const daysRemaining = computeDaysRemaining();
  const daysPassed = computeDaysPassed();

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: template,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          daysRemaining,
          daysPassed,
          municipalityName: municipality.name,
          signups: municipality.signups,
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

const computeDaysPassed = () => {
  return Math.abs(
    Math.round(
      (new Date() - new Date(START_OF_QUALIFYING_PERIOD)) /
        (1000 * 60 * 60 * 24)
    )
  );
};

module.exports = sendMail;
