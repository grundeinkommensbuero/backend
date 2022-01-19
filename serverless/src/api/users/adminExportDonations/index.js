const { errorResponse } = require('../../../shared/apiResponse');
const { getUsersWithDonations } = require('../../../shared/users');

const CREDITOR_ID = 'DE80ZZZ00002240199';

module.exports.handler = async () => {
  try {
    const users = await getUsersWithDonations();

    console.log('Fetched donations, generating csv...');

    const dataString = generateCsv(users);

    return {
      statusCode: 200,
      body: dataString,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'text/csv',
      },
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while exporting donations', error);
    return errorResponse(500, 'error while exporting donations', error);
  }
};

const generateCsv = users => {
  const header =
    'SvcLvl,PmtMtd,Amt,AmtCcy,MndtId,MndtLclInstrm,CdtrId,ReqdExctnDt,MndtDtOfSgntr,SeqTp,RmtInf,PurpCd,RmtdNm,RmtdAcctCtry,RmtdAcctIBAN\n';

  let dataString = header;

  const stats = { count: 0, sum: 0 };
  for (const user of users) {
    if ('onetimeDonations' in user.donations) {
      for (const donation of user.donations.onetimeDonations) {
        const debitDate = new Date(donation.debitDate);
        const now = new Date();
        if (
          debitDate.getFullYear() === now.getFullYear() &&
          debitDate.getMonth === now.getMonth()
        ) {
          dataString += createDonationString(donation, false);
        }
      }
    }

    if ('recurringDonation' in user.donations) {
      const donation = user.donations.recurringDonation;
      // Leave out yearly donations unless they were added the same month
      if (
        donation.yearly &&
        new Date(donation.firstDebitDate).getMonth() !== new Date().getMonth()
      ) {
        console.log('is yearly', donation.id, donation.createdAt);
      } else {
        if ('updatedAt' in donation) {
          console.log(
            'Donation updated (userId, donationId, updatedAt)',
            user.cognitoId,
            donation.id,
            donation.updatedAt
          );

          stats.count++;
          stats.sum += donation.amount;
        }

        if ('cancelledAt' in donation) {
          console.log(
            'Donation cancelled (userId, donationId, updatedAt)',
            user.cognitoId,
            donation.id,
            donation.cancelledAt
          );

          // If donation was also updated and updated is newer than cancelled we
          // add the donation
          if (
            'updatedAt' in donation &&
            new Date(donation.cancelledAt) < new Date(donation.updatedAt)
          ) {
            console.log('Was cancelled and then updated', donation.id);
            dataString += createDonationString(donation, true);

            stats.count++;
            stats.sum += donation.amount;
          }
        } else {
          console.log(
            'Donation  (userId, donationId)',
            user.cognitoId,
            donation.id,
            donation.lastName
          );
          dataString += createDonationString(donation, true);
          stats.count++;
          stats.sum += donation.amount;
        }
      }
    }
  }

  return dataString;
};

const createDonationString = (donation, isRecurring) => {
  // we only want the current day (YYYY-MM-DD)
  const debitDate = isRecurring
    ? donation.firstDebitDate.substring(0, 10)
    : donation.debitDate.substring(0, 10);
  const createdAt = donation.createdAt.substring(0, 10);

  return `SEPA,DD,${donation.amount},EUR,${
    donation.id
  },CORE,${CREDITOR_ID},${debitDate},${createdAt},${
    isRecurring ? 'RCUR' : 'OOFF'
  },Spende Expedition Grundeinkommen,CHAR,${donation.firstName} ${
    donation.lastName
  },DE,${donation.iban}\n`;
};
