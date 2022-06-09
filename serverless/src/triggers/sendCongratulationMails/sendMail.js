const { apiKey, apiSecret } = require('../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const GOALS = {
  'schleswig-holstein-1': '24000',
  'brandenburg-1': '24000',
  'hamburg-1': '12000',
  'bremen-1': '5000',
  'berlin-1': '24000',
  'berlin-2': '24000',
};

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
};

// Function which sends an email to congratulate for the reception of list(s)
// gets a user object, which is why we destructure the object
const sendMail = (
  { email, username, userId, dailyCount, totalCount, campaign, pdfUrl },
  totalCountForAllUsers
) => {
  console.log('about to send email');

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: 1480788,
        // TemplateID: 3768236, // democracy
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          dailyCount,
          totalCount,
          totalCountGreater5: totalCount > 5,
          userId,
          campaignCode: campaign.code,
          totalCountForAllUsers,
          totalCountGoal: GOALS[campaign.code],
          state: STATES[campaign.state],
          pdfUrl,
        },
      },
    ],
  });
};

module.exports = sendMail;
