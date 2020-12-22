let mailjet;

const { apiKey, apiSecret } = require('../../../../mailjetConfig');

// Mailjet config should only be provided optionally
if (apiKey && apiSecret) {
  mailjet = require('node-mailjet').connect(apiKey, apiSecret);
} else {
  console.log('No mailjet config provided');
}
const { createChristmasCard } = require('./createChristmasCard');

const DONATION_TEMPLATE = 1885162;
const CHRISTMAS_TEMPLATE = 2060355;

// Function which sends an email to the user after donation was changed
const sendMail = async (
  email,
  {
    recurring,
    amount,
    firstName,
    lastName,
    certificateReceiver,
    certificateGiver,
  },
  { debitDate, id, recurringDonationExisted },
  username
) => {
  let amountAsString = amount.toString().replace('.', ',');
  if (amountAsString.includes(',')) {
    if (amountAsString.split(',')[1].length === 1) {
      amountAsString = `${amountAsString}0`;
    }
  } else {
    amountAsString = `${amountAsString},00`;
  }

  const params = {
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: recurring ? DONATION_TEMPLATE : CHRISTMAS_TEMPLATE,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          recurringDonationExisted,
          amount: amountAsString,
          firstName,
          lastName,
          debitDate: debitDate && formatDate(debitDate),
          id,
          nameOfGifted: certificateReceiver,
        },
      },
    ],
  };

  // If donation is gift we want to create an attachment with a christmas card
  if (!recurring) {
    const christmasCard = await createChristmasCard(
      certificateGiver,
      certificateReceiver,
      amountAsString
    );

    params.Messages[0].Attachments = [
      {
        Filename: 'Weihnachtskarte.pdf',
        Base64Content: Buffer.from(christmasCard).toString('base64'),
        ContentType: 'application/pdf',
      },
    ];
  }

  return mailjet.post('send', { version: 'v3.1' }).request(params);
};

module.exports = sendMail;

const formatDate = date => {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
};
