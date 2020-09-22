const { apiKey, apiSecret } = require('../../../mailjetConfig');
const { formatNumber } = require('../../shared/utils');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const CAMPAIGN_SHORTS = {
  'schleswig-holstein-1': 'sh',
  'brandenburg-1': 'bb',
  'berlin-1': 'b',
  'hamburg-1': 'hh',
  'bremen-1': 'hb',
};

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
};

const GOALS = {
  'schleswig-holstein-1': '24.000',
  'brandenburg-1': '24.000',
  'hamburg-1': '12.000',
  'bremen-1': '5.000',
  'berlin-1': '24.000',
};

// Function which sends an email to remind user to send signature lists
// gets a user object, which is why we destructure the object
const sendMail = (
  { email, username, cognitoId: userId },
  listId,
  campaign,
  daysAgoListWasDownloaded,
  signatureCounts,
  listCounts,
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
        TemplateID: 1698024,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          userId,
          campaignCode: campaign.code,
          campaignShort: CAMPAIGN_SHORTS[campaign.code],
          state: STATES[campaign.state],
          days: daysAgoListWasDownloaded,
          signatureCount:
            campaign.code in signatureCounts
              ? formatNumber(signatureCounts[campaign.code].computed)
              : '',
          listCount:
            campaign.code in listCounts
              ? formatNumber(listCounts[campaign.code].total.downloads)
              : '',
          goal: GOALS[campaign.code],
          listId,
        },
        Attachments: attachments,
      },
    ],
  });
};

module.exports = sendMail;
