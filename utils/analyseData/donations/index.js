/**
 * This script fetches all the (new) donations from the database and
 * transforms them into a csv.
 */

const { PROD_USERS_TABLE_NAME } = require('../../config');
const { getUsersWithDonations } = require('../../shared/users/getUsers');
const fs = require('fs');

const CREDITOR_ID = 'DE80ZZZ00002240199';

const run = async () => {
  const users = await getUsersWithDonations(PROD_USERS_TABLE_NAME);

  console.log('Fetched donations, generating csv...');

  generateCsv(users);
};

const generateCsv = users => {
  let dataString =
    'SvcLvl,PmtMtd,Amt,AmtCcy,MndtId,MndtLclInstrm,CdtrId,ReqdExctnDt,MndtDtOfSgntr,SeqTp,RmtInf,PurpCd,RmtdNm,RmtdAcctCtry,RmtdAcctIBAN\n';

  for (const user of users) {
    if ('onetimeDonations' in user.donations) {
      for (const donation of user.donations.onetimeDonations) {
        dataString += createDonationString(donation, false);
      }
    }

    if ('recurringDonation' in user.donations) {
      for (const donation of user.donations.recurringDonation) {
        dataString += createDonationString(donation, true);

        if ('updatedAt' in donation) {
          console.log(
            'Donation updated (userId, donationId, updatedAt)',
            user.cognitoId,
            donation.id,
            donation.updatedAt
          );
        }
      }
    }
  }

  fs.writeFileSync(
    `output/donations_${new Date().toISOString().substring(0, 10)}.csv`,
    dataString
  );
};

const createDonationString = (donation, isRecurring) => {
  // we only want the current day (YYYY-MM-DD)
  const debitDate = isRecurring
    ? donation.firstDebitDate.substring(0, 10)
    : donation.debitDate.substring(0, 10);
  const createdAt = donation.createdAt.substring(0, 10);

  return `SEPA,${donation.amount},EUR,${
    donation.id
  },CORE,${CREDITOR_ID},${debitDate},${createdAt},${
    isRecurring ? 'RCUR' : 'OOFF'
  },Spende Expedition Grundeinkommen,CHAR,${donation.firstName} ${
    donation.lastName
  },DE,${donation.iban}\n`;
};

run();
