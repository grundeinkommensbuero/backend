const { apiKey, apiSecret } = require('../../../mailjetConfig');
const { formatNumber } = require('../../shared/utils');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

// TODO as soon as tempaltes are ready
const mailTypeToTemplate = {
  'B2.1': 3719962,
  'B2.2': 3719962,
  'B3.1': 3720184,
  'B3.2': 3720184,
  'B3.3': 3720184,
  'B4.1': 3720202,
  'B4.2': 3720202,
  'B4.3': 3720202,
  'B6.1': 3717141,
  'B6.2': 3717141,
  'B6.3': 3717141,
};

const GOALS = {
  'schleswig-holstein-1': '24.000',
  'brandenburg-1': '24.000',
  'hamburg-1': '12.000',
  'bremen-1': '5.000',
  'berlin-1': '24.000',
  'berlin-2': '24.000',
  'democracy-1': '20.000',
};

// Function which sends an email to remind user to send signature lists
// gets a user object, which is why we destructure the object
const sendMail = (
  { email, username, cognitoId: userId },
  listId,
  campaign,
  daysSinceDownload,
  mailType,
  signatureCounts,
  listCounts
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
          campaign:
            campaign.state === 'berlin'
              ? 'Berlin soll Grundeinkommen testen'
              : 'Demokratie für alle',
          days: daysSinceDownload,
          signatureCount:
            campaign.code in signatureCounts
              ? formatNumber(signatureCounts[campaign.code].computed)
              : '0',
          listCount:
            campaign.code in listCounts
              ? formatNumber(listCounts[campaign.code].total.downloads)
              : '0',
          goal: GOALS[campaign.code],
        },
      },
    ],
  });
};

module.exports = sendMail;
