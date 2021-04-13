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
  const header =
    'SvcLvl,PmtMtd,Amt,AmtCcy,MndtId,MndtLclInstrm,CdtrId,ReqdExctnDt,MndtDtOfSgntr,SeqTp,RmtInf,PurpCd,RmtdNm,RmtdAcctCtry,RmtdAcctIBAN\n';

  let dataStringOnetimeDonations = header;
  let dataStringRecurringDonations = header;

  for (const user of users) {
    if ('onetimeDonations' in user.donations) {
      for (const donation of user.donations.onetimeDonations) {
        if (new Date(donation.debitDate) > new Date('2021-03-17')) {
          dataStringOnetimeDonations += createDonationString(donation, false);
        }
      }
    }

    if ('recurringDonation' in user.donations) {
      const donation = user.donations.recurringDonation;
      // TODO handle yearly properly, because we don't want to add it every month
      if (donation.yearly) {
        console.log('is yearly', donation.id, donation.createdAt);
      } else {
        if ('updatedAt' in donation) {
          console.log(
            'Donation updated (userId, donationId, updatedAt)',
            user.cognitoId,
            donation.id,
            donation.updatedAt
          );
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
            dataStringRecurringDonations += createDonationString(
              donation,
              true
            );
          }
        } else {
          dataStringRecurringDonations += createDonationString(donation, true);
        }
      }
    }
  }

  fs.writeFileSync(
    `output/donations_onetime_${new Date().toISOString().substring(0, 10)}.csv`,
    dataStringOnetimeDonations
  );

  fs.writeFileSync(
    `output/donations_recurring_${new Date()
      .toISOString()
      .substring(0, 10)}.csv`,
    dataStringRecurringDonations
  );
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

run();
