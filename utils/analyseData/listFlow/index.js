const { getAllUsers } = require('../../shared/users/getUsers');
const CONFIG = require('../../config');
const { getSignatureCountOfUser } = require('../../shared/signatures');

const run = async () => {
  console.log('Fetching users');

  const users = await getAllUsers(
    CONFIG.PROD_USERS_TABLE_NAME,
    'attribute_exists(listFlow)'
  );

  console.log('Fetched users', users.length);

  const stats = {
    steps: {},
    emails: {},
    emailsInTotal: 0,
    usersOfWhomWeReceivedLists: 0,
  };

  for (const user of users) {
    for (const step in user.listFlow) {
      if (step !== 'emailsSent') {
        // Count which steps are already done
        if (!(step in stats.steps)) {
          stats.steps[step] = 0;
        }

        // Value should probably be true anyway
        if (user.listFlow[step].value) {
          stats.steps[step]++;
        }

        // Check if we received lists from this user, if they completed the journey
        if (step === 'sentList') {
          const signatureCount = await getSignatureCountOfUser(
            CONFIG.PROD_SIGNATURES_TABLE_NAME,
            user.cognitoId,
            'berlin-2'
          );

          if (signatureCount > 0) {
            stats.usersOfWhomWeReceivedLists++;
          }
        }
      } else {
        // Count which emails were sent
        for (const email of user.listFlow.emailsSent) {
          if (!(email.key in stats.emails)) {
            stats.emails[email.key] = 0;
          }

          stats.emails[email.key]++;
        }

        stats.emailsInTotal += user.listFlow.emailsSent.length;
      }
    }
  }

  console.log('\n STATS');
  // I am not printing the object itself because this way I can print the correct order
  // I could also try the order the object, but not really necessary
  console.log('Downloaded list: ', stats.steps.downloadedList);
  console.log('Printed list: ', stats.steps.printedList);
  console.log('Signed list: ', stats.steps.signedList);
  console.log('Shared: ', stats.steps.sharedList);
  console.log('Sent list: ', stats.steps.sentList);

  console.log('\n EMAILS');

  // Ordering emails, because we can't be sure, which keys exist
  const ordered = Object.keys(stats.emails)
    .sort()
    .reduce((obj, key) => {
      obj[key] = stats.emails[key];
      return obj;
    }, {});

  console.log(ordered);

  console.log('\n Emails per user: ', stats.emailsInTotal / users.length);
  console.log(
    'Users of whom we received lists of those who have finished journey: ',
    stats.usersOfWhomWeReceivedLists
  );
};

run();
