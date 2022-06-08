const { apiKey, apiSecret } = require('../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const mailTypeToTemplate = {
  1: 111,
  2: 111,
  3: 111,
};

// Function which sends an email to a user who has signed up for
// take your lists to work campaign
const sendMail = ({ email, username, userId }, mailType) => {
  const templateID = mailTypeToTemplate[mailType];

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: templateID,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          userId,
        },
      },
    ],
  });
};

module.exports = sendMail;
