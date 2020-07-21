const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const CAMPAIGN_SLUGS = {
  'schleswig-holstein-1': 'schleswig-holstein',
  'brandenburg-1': 'brandenburg',
  'berlin-1': 'berlin',
  'hamburg-1': 'hamburg',
  'bremen-1': 'bremen',
  'berlin-0': 'berlin',
};

const STATES = {
  'schleswig-holstein-1': 'Schleswig-Holstein',
  'brandenburg-1': 'Brandenburg',
  'berlin-1': 'Berlin',
  'hamburg-1': 'Hamburg',
  'bremen-1': 'Bremen',
  'berlin-0': 'Berlin',
};

// Function which sends an email to welcome the user to our expedition
const sendMail = (email, campaignCode, userId) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: 1583647,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          userId,
          campaignCode,
          campaignSlug: CAMPAIGN_SLUGS[campaignCode],
          state: STATES[campaignCode],
        },
      },
    ],
  });
};

module.exports = sendMail;
