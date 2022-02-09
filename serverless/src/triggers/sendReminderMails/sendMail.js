const { apiKey, apiSecret } = require('../../../mailjetConfig');
const { formatNumber } = require('../../shared/utils');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

// TODO as soon as tempaltes are ready
const mailTypeToTemplate = {
  'B2.1': 1111,
  'B2.2': 1111,
  'B3.1': 1111,
  'B3.2': 1111,
  'B3.3': 1111,
  'B4.1': 1111,
  'B4.2': 1111,
  'B4.3': 1111,
  'B6.1': 1111,
  'B6.2': 1111,
  'B6.3': 1111,
};

// TODO: change params as soon as it is clear, what params the emails need

// Function which sends an email to remind user to send signature lists
// gets a user object, which is why we destructure the object
const sendMail = (
  { email, username, cognitoId: userId },
  listId,
  campaign,
  daysAgoListWasDownloaded,
  mailType,
  signatureCounts,
  listCounts,
  registeredSignatures,
  attachments
) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: mailTypeToTemplate[mailType],
        Subject: 'TODO',
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        // TODO: as soon as templates are ready
        Variables: {
          username,
          userId,
          listId,
          registeredSignatures,
        },
        Attachments: attachments,
      },
    ],
  });
};

module.exports = sendMail;
