const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const RECURRING_DONATION_TEMPLATE = 3911029;
const YEARLY_DONATION_TEMPLATE = 2606607;
const ONETIME_DONATION_TEMPLATE = 2060355;
const CANCEL_TEMPLATE = 2209988;

// Function which sends an email to the user after donation was changed
const sendMail = async (
  email,
  { recurring, amount, firstName, lastName, cancel, yearly },
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

  if (recurring && yearly) {
    template = YEARLY_DONATION_TEMPLATE;
  } else if (recurring) {
    template = RECURRING_DONATION_TEMPLATE;
  } else if (cancel) {
    template = CANCEL_TEMPLATE;
  } else {
    template = ONETIME_DONATION_TEMPLATE;
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
