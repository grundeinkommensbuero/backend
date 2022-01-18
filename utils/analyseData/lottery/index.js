/**
 * This script fetches all the (new) donations from the database and
 * transforms them into a csv.
 */

const { PROD_USERS_TABLE_NAME } = require('../../config');
const { getUsersWithLottery } = require('../../shared/users/getUsers');
const fs = require('fs');
const parse = require('csv-parse');

const run = async () => {
  const users = await getUsersWithLottery(PROD_USERS_TABLE_NAME);

  const paypalPeople = await readCsv();

  console.log(paypalPeople);

  console.log('Fetched users, generating csv...');

  generateCsv(users, paypalPeople);
};

const generateCsv = (users, paypalPeople) => {
  let string =
    'user id,email,username,date,lottery code, Datum letzte einmalige Spende, Höhe letzte einmalige Spende, Datum monatliche Spende, Höhe monatliche Spende, Datum Paypal Spende, Höhe Paypal Spende\n';

  for (const user of users) {
    const onetimeDonation = { createdAt: '', amount: '' };
    const recurringDonation = { createdAt: '', amount: '' };
    const paypalDonation = { createdAt: '', amount: '' };

    if ('donations' in user) {
      if ('onetimeDonations' in user.donations) {
        const donation =
          user.donations.onetimeDonations[
            user.donations.onetimeDonations.length - 1
          ];

        onetimeDonation.createdAt = donation.createdAt;
        onetimeDonation.amount = donation.amount;
      }

      if ('recurringDonation' in user.donations) {
        const donation = user.donations.recurringDonation;

        recurringDonation.createdAt = donation.createdAt;
        recurringDonation.amount = donation.amount;
      }
    }

    const paypalData = paypalPeople.find(({ email }) => email === user.email);

    if (paypalData) {
      paypalDonation.createdAt = paypalData.createdAt;
      paypalDonation.amount = paypalData.amount;
    }

    string += `${user.cognitoId},${user.email},${user.username},${user.lottery.timestamp},${user.lottery.id},${onetimeDonation.createdAt},${onetimeDonation.amount},${recurringDonation.createdAt},${recurringDonation.amount},${paypalDonation.createdAt},"${paypalDonation.amount}"\n`;
  }

  fs.writeFileSync('output/lottery.csv', string);
};

const readCsv = () => {
  return new Promise(resolve => {
    const users = [];
    let count = 0;

    fs.createReadStream('./data/paypal.csv')
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        // leave out headers
        if (count > 0) {
          user = {
            email: row[10],
            amount: row[5],
            createdAt: row[0],
          };

          if (typeof user !== 'undefined' && user.email !== '') {
            users.push(user);
          }
        }

        count++;
      })
      .on('end', () => {
        console.log('finished parsing');
        resolve(users);
      });
  });
};

run();
