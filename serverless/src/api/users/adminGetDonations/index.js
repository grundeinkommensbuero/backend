const { errorResponse } = require('../../../shared/apiResponse');
const { getUsersWithDonations } = require('../../../shared/users');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async () => {
  try {
    const users = await getUsersWithDonations();

    const donations = formatDonations(users);

    return {
      statusCode: 200,
      body: JSON.stringify({
        donations,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting donations', error);
    return errorResponse(500, 'error while getting donations', error);
  }
};

const formatDonations = users => {
  const recurringDonations = [];
  const onetimeDonations = [];
  for (const user of users) {
    if ('onetimeDonations' in user.donations) {
      for (const donation of user.donations.onetimeDonations) {
        donation.iban = anonymizeIban(donation.iban);
        onetimeDonations.push({ ...donation, userId: user.cognitoId });
      }
    }

    if ('recurringDonation' in user.donations) {
      const donation = user.donations.recurringDonation;
      donation.iban = anonymizeIban(donation.iban);
      recurringDonations.push({ ...donation, userId: user.cognitoId });
    }
  }

  sortDonations(recurringDonations);
  sortDonations(onetimeDonations);

  return { recurringDonations, onetimeDonations };
};

const anonymizeIban = iban => {
  return `************${iban.slice(-4)}`;
};

// Sort donations by most recent
const sortDonations = donations => {
  donations.sort((donation1, donation2) => {
    const debitDate1 = donation1.debitDate || donation1.firstDebitDate;
    const debitDate2 = donation2.debitDate || donation2.firstDebitDate;

    // Most recently created should come first, if same day sort by name
    if (
      new Date(debitDate1).getMonth() === new Date(debitDate2).getMonth() &&
      new Date(debitDate1).getFullYear() ===
        new Date(debitDate2).getFullYear() &&
      new Date(debitDate1).getDate() === new Date(debitDate2).getDate()
    ) {
      if (
        donation1.firstName.toLowerCase() < donation2.firstName.toLowerCase()
      ) {
        return -1;
      }

      if (
        donation1.firstName.toLowerCase() > donation2.firstName.toLowerCase()
      ) {
        return 1;
      }
    }

    return new Date(debitDate2) - new Date(debitDate1);
  });
};
