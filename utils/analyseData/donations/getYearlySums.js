const { PROD_USERS_TABLE_NAME } = require('../../config');
const { getUsersWithDonations } = require('../../shared/users/getUsers');
const fs = require('fs');

const YEAR = 2021;

const run = async () => {
  const users = await getUsersWithDonations(PROD_USERS_TABLE_NAME);

  console.log('Fetched donations, analysing data...');

  const usersWithBigDonations = [];
  let firstName;
  let lastName;

  for (const user of users) {
    let onetimeDonationSum = 0;
    let yearlyDonationSum = 0;
    let monthlyDonationSum = 0;

    if ('onetimeDonations' in user.donations) {
      for (const donation of user.donations.onetimeDonations) {
        if (new Date(donation.debitDate).getFullYear() === YEAR) {
          onetimeDonationSum += donation.amount;
          firstName = donation.firstName;
          lastName = donation.lastName;
        }
      }
    }

    if ('recurringDonation' in user.donations) {
      const donation = user.donations.recurringDonation;

      firstName = donation.firstName;
      lastName = donation.lastName;

      if (donation.yearly) {
        if (new Date(donation.debitDate).getFullYear() <= YEAR) {
          yearlyDonationSum += donation.amount;
        }
      } else if (new Date(donation.firstDebitDate).getFullYear() < YEAR) {
        monthlyDonationSum += 12 * donation.amount;
      } else if (new Date(donation.firstDebitDate).getFullYear() === YEAR) {
        monthlyDonationSum +=
          (12 - new Date(donation.firstDebitDate).getMonth()) * donation.amount;
      }
    }

    const totalSum =
      onetimeDonationSum + yearlyDonationSum + monthlyDonationSum;

    if (totalSum >= 200 || lastName === 'Berndt') {
      usersWithBigDonations.push({
        onetimeDonationSum,
        yearlyDonationSum,
        monthlyDonationSum,
        totalSum,
        email: user.email,
        userId: user.cognitoId,
        firstName,
        lastName,
      });
    }
  }

  console.log('Analysed data, generating csv...');

  generateCsv(usersWithBigDonations);
};

const generateCsv = users => {
  let string =
    'user id,email, firstname, lastname, onetime donation sum,monthly donation sum, yearly donation sum, total sum\n';

  for (const user of users) {
    string += `${user.userId}, ${user.email},${user.firstName}, ${user.lastName},${user.onetimeDonationSum},${user.monthlyDonationSum}, ${user.yearlyDonationSum},${user.totalSum}\n`;
  }

  fs.writeFileSync(`output/summary/${YEAR}.csv`, string);
};

run();
