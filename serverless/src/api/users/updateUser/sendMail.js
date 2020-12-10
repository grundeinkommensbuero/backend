const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const DONATION_TEMPLATE = 1885162;
const CHRISTMAS_TEMPLATE = 2060355;

// IDEAL BOLD 19

// Function which sends an email to the user after donation was changed
const sendMail = (
  email,
  { recurring, amount, firstName, lastName, nameOfGifted },
  { debitDate, id, recurringDonationExisted }
) => {
  let amountAsString = amount.toString().replace('.', ',');
  if (amountAsString.includes(',')) {
    if (amountAsString.split(',')[1].length === 1) {
      amountAsString = `${amountAsString}0`;
    }
  } else {
    amountAsString = `${amountAsString},00`;
  }

  return mailjet.post('send', { version: 'v3.1' }).request({
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
          recurringDonationExisted,
          amount: amountAsString,
          firstName,
          lastName,
          debitDate: formatDate(debitDate),
          id,
          nameOfGifted,
        },
      },
    ],
  });
};

module.exports = sendMail;

const formatDate = date => {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
};
