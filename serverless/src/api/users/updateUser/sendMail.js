const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);
// IDEAL BOLD 19

// Function which sends an email to the user after donation was changed
const sendMail = (
  email,
  { recurring, amount, firstName, lastName },
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
        TemplateID: 1885162,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          recurring,
          recurringDonationExisted,
          amount: amountAsString,
          firstName,
          lastName,
          debitDate: formatDate(debitDate),
          id,
        },
      },
    ],
  });
};

module.exports = sendMail;

const formatDate = date => {
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
};
