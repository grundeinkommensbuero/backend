const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const { createLotteryCard } = require('./createLotteryCard');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const TEMPLATE = 3417614;

// Function which sends an email to the user after donation was changed
const sendMail = async (email, { id }, username) => {
  const lotteryCard = await createLotteryCard(username, id);

  const params = {
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: TEMPLATE,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          lotteryId: id,
          username,
        },
        Attachments: [
          {
            Filename: 'Weihnachts-Los.pdf',
            Base64Content: Buffer.from(lotteryCard).toString('base64'),
            ContentType: 'application/pdf',
          },
        ],
      },
    ],
  };

  return mailjet.post('send', { version: 'v3.1' }).request(params);
};

module.exports = sendMail;
