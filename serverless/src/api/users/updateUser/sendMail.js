const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const { createChristmasCard } = require('./createChristmasCard');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const DONATION_TEMPLATE = 1885162;
const CHRISTMAS_TEMPLATE = 2060355;
const CANCEL_TEMPLATE = 2209988;

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
    cancel,
  },
  // donations is the entire donations object which was saved
  { debitDate, id, recurringDonationExisted, donations },
  username
) => {
  let variables = {};

  if (!cancel) {
    variables = {
      username,
      recurringDonationExisted,
      amount: amountToString(amount),
      firstName,
      lastName,
      debitDate: debitDate && formatDate(debitDate),
      id,
      nameOfGifted: certificateReceiver,
    };
  } else {
    // If the donation was cancelled we want to pass
    // the amount of the cancelled donation to the mail template
    variables = {
      username,
      amount: amountToString(donations.recurringDonation.amount),
    };
  }

  let template = '';

  if (recurring) {
    template = DONATION_TEMPLATE;
  } else if (cancel) {
    template = CANCEL_TEMPLATE;
  } else {
    template = CHRISTMAS_TEMPLATE;
  }

  const params = {
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: template,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: variables,
      },
    ],
  };

  // If donation is gift we want to create an attachment with a christmas card
  if (!recurring && !cancel) {
    const christmasCard = await createChristmasCard(
      certificateGiver,
      certificateReceiver,
      amountToString(amount)
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

const amountToString = amount => {
  let amountAsString = amount.toString().replace('.', ',');
  if (amountAsString.includes(',')) {
    if (amountAsString.split(',')[1].length === 1) {
      amountAsString = `${amountAsString}0`;
    }
  } else {
    amountAsString = `${amountAsString},00`;
  }

  return amountAsString;
};
