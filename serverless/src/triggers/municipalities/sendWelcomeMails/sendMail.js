const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE_DEFAULT = 2617393;
const TEMPLATE_BERLIN = 'TODO';
const TEMPLATE_BREMEN_DEFAULT = 3107979;
const TEMPLATE_BREMEN_ACTIVE_USER = 3108929;
const AGS_BERLIN = '11000000';
const AGS_BREMEN = '04011000';

const END_OF_QUALIFYING_PERIOD = '2021-03-21 18:00:00';

const sendMail = (
  { username, email, cognitoId: userId, customNewsletters },
  municipality
) => {
  let templateId;

  if (municipality.ags === AGS_BREMEN) {
    // If ags is bremen we want to check if user wants to get extra info (is active user)
    // Depending on that we send a different template
    if (customNewsletters) {
      const newsletterSetting = customNewsletters.find(
        newsletter => newsletter.ags === AGS_BREMEN
      );

      if (newsletterSetting && newsletterSetting.extraInfo) {
        templateId = TEMPLATE_BREMEN_ACTIVE_USER;
      } else {
        templateId = TEMPLATE_BREMEN_DEFAULT;
      }
    } else {
      templateId = TEMPLATE_BREMEN_DEFAULT;
    }
  } else if (municipality.ags === AGS_BERLIN) {
    templateId = TEMPLATE_BERLIN;
  } else {
    templateId = TEMPLATE_DEFAULT;
  }

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: templateId,
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
