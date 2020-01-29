const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const {
  getAllUsers,
  getAllUnverifiedCognitoUsers,
  isVerified,
} = require('../../../shared/users');
const tableNameWithoutConsent = 'users-without-consent';

module.exports.analyseUsers = async () => {
  let users = await getAllUsers();

  //loop through backup users and add all the users who are not already in users
  users = await migrateUsersWithoutNewsletterConsent(users);

  const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();

  console.log('not verified count', unverifiedCognitoUsers.length);

  //go through users to sum up pledged signatures
  const campaignStats = {};
  for (let user of users) {
    //check if the user is verified
    let verified = isVerified(user, unverifiedCognitoUsers);

    //if user is not verified we do not need to count the signatures
    if ('pledges' in user) {
      //go through pledges of this users
      for (let pledge of user.pledges) {
        const campaign = pledge.campaign.code;

        //initialize object for this pledge;
        if (!(campaign in campaignStats)) {
          campaignStats[campaign] = {
            verifiedUsers: { count: 0, signatures: 0 },
            unverifiedUsers: { count: 0 },
            usersWithNewsletterConsent: { count: 0, signatures: 0 },
            pledgesMap: {}, // how many people have pledged x signatures
            // powerUsers: [],
          };
        }

        //the users, wo were migrated are not in cognito
        if (verified || user.fromBackup) {
          campaignStats[campaign].verifiedUsers.count++;
          let newsletterConsent = false;
          //count the newsletter consents for all verified users
          if ('newsletterConsent' in user && user.newsletterConsent.value) {
            campaignStats[campaign].usersWithNewsletterConsent.count++;
            newsletterConsent = true;
          }

          //count the pledged signatures for all verified users
          if ('signatureCount' in pledge) {
            const signatureCount = parseInt(pledge.signatureCount);
            if (!isNaN(signatureCount)) {
              //if the newsletter consent was given, also add it up for those users
              if (newsletterConsent) {
                campaignStats[
                  campaign
                ].usersWithNewsletterConsent.signatures += signatureCount;
              }
              //otherwise only add it for the (only) verified users
              campaignStats[
                campaign
              ].verifiedUsers.signatures += signatureCount;

              // Check if the signatureCount is already in the pledge map
              if (!(signatureCount in campaignStats[campaign].pledgesMap)) {
                campaignStats[campaign].pledgesMap[signatureCount] = 0;
              }

              campaignStats[campaign].pledgesMap[signatureCount]++;

              //generate a list of power users
              //(20+ pledged signatures or wants to collect in public spaces)
              /*  don't really need it right now
             if (
                signatureCount >= 20 ||
                pledge.wouldCollectSignaturesInPublicSpaces
              ) {
                campaignStats[campaign].powerUsers.push(user);
              } */
            }
          }
        } else {
          campaignStats[campaign].unverifiedUsers.count++;
        }
      }
    }
  }

  return campaignStats;
};

const getAllUsersWithoutNewsletterConsent = () => {
  const params = {
    TableName: tableNameWithoutConsent,
  };
  return ddb.scan(params).promise();
};

const migrateUsersWithoutNewsletterConsent = async users => {
  let added = 0;
  const backupUsers = await getAllUsersWithoutNewsletterConsent();
  console.log('Backup users count', backupUsers.Count);

  for (let backupUser of backupUsers.Items) {
    //check if the user is already in users
    if (users.findIndex(user => user.email === backupUser.email) === -1) {
      //backup user is not already in there
      backupUser.fromBackup = true;
      users.push(backupUser);
      added++;
    }
  }

  console.log(`Added ${added} users from backup`);
  return users;
};
