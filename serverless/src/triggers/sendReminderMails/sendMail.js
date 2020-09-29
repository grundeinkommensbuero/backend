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
  dibb: 'Brandenburg',
};

const GOALS = {
  'schleswig-holstein-1': '24.000',
  'brandenburg-1': '24.000',
  'hamburg-1': '12.000',
  'bremen-1': '5.000',
  'berlin-1': '24.000',
};

const NUM_TO_WORD = {
  2: 'zwei',
  3: 'drei',
  4: 'vier',
  5: 'fünf',
  6: 'sechs',
  7: 'sieben',
  8: 'acht',
};

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
  // If the list was from brandenburg plattform we want to pass the same info as brandenburg
  const campaignCode =
    campaign.code === 'dibb-1' ? 'brandenburg-1' : campaign.code;

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        // The final mails (mailType === 'ultimate' || 'penultimate') have a different template entirely
        TemplateID: mailType ? 1709553 : 1698024,
        Subject:
          mailType === 'ultimate'
            ? `Letzte Erinnerung: Bitte schick uns jetzt deine Unterschriften für ${
                STATES[campaign.state]
              } soll Grundeinkommen testen!`
            : undefined,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          userId,
          campaignShort: CAMPAIGN_SHORTS[campaignCode],
          state: STATES[campaign.state],
          days: daysAgoListWasDownloaded,
          // Compute how many weeks ago the list was sent
          weeks: NUM_TO_WORD[Math.round(daysAgoListWasDownloaded / 7)],
          signatureCount:
            campaignCode in signatureCounts
              ? formatNumber(signatureCounts[campaignCode].computed)
              : '',
          listCount:
            campaignCode in listCounts
              ? formatNumber(listCounts[campaignCode].total.downloads)
              : '',
          goal: GOALS[campaignCode],
          listId,
          registeredSignatures,
        },
        Attachments: attachments,
      },
    ],
  });
};

module.exports = sendMail;
