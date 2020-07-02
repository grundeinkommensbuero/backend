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

  // loop through backup users and add all the users who are not already in users
  users = await migrateUsersWithoutNewsletterConsent(users);

  const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();

  console.log('not verified count', unverifiedCognitoUsers.length);

  // go through users to sum up pledged signatures
  const campaignStats = {
    totalCount: { verifiedUsers: 0, unverifiedUsers: 0 },
  };

  for (const user of users) {
    // check if the user is verified
    const verified = isVerified(user, unverifiedCognitoUsers);

    const newsletterConsent =
      'newsletterConsent' in user && user.newsletterConsent.value;

    const campaignsOfUser = [];

    if (verified) {
      // if user is not verified we do not need to count the signatures
      if ('pledges' in user) {
        // go through pledges of this users
        for (const pledge of user.pledges) {
          const campaign = pledge.campaign.code;

          campaignsOfUser.push(campaign);

          // initialize object for this pledge;
          if (!(campaign in campaignStats)) {
            campaignStats[campaign] = initiateCampaignStats();
          }

          // the users, wo were migrated are not in cognito
          if (verified || user.fromBackup) {
            campaignStats[campaign].verifiedUsers.pledges++;

            // count the pledged signatures for all verified users
            if ('signatureCount' in pledge) {
              const signatureCount = parseInt(pledge.signatureCount, 10);

              if (!isNaN(signatureCount)) {
                // if the newsletter consent was given, also add it up for those users
                if (newsletterConsent) {
                  campaignStats[
                    campaign
                  ].usersWithNewsletterConsent.signatures += signatureCount;
                }

                // otherwise only add it for the (only) verified users
                campaignStats[
                  campaign
                ].verifiedUsers.signatures += signatureCount;

                // Check if the signatureCount is already in the pledge map
                if (!(signatureCount in campaignStats[campaign].pledgesMap)) {
                  campaignStats[campaign].pledgesMap[signatureCount] = 0;
                }

                campaignStats[campaign].pledgesMap[signatureCount]++;
              }
            }
          }
        }
      }

      // Also check if there is campaign code which was added when downloading list
      if ('signatureCampaigns' in user) {
        // filter out duplicates
        const signatureCampaigns = user.signatureCampaigns.filter(
          (campaign, index) =>
            user.signatureCampaigns.findIndex(
              item => item.code === campaign.code
            ) === index
        );

        for (const campaign of signatureCampaigns) {
          campaignsOfUser.push(campaign.code);

          if (!(campaign.code in campaignStats)) {
            campaignStats[campaign.code] = initiateCampaignStats();
          }

          if (newsletterConsent) {
            campaignStats[campaign.code].usersWithNewsletterConsent
              .downloaders++;
          }

          campaignStats[campaign.code].verifiedUsers.downloaders++;
        }
      }

      // Filter out duplicates of campaignsOfUser
      const uniqueCampaignsOfUser = [...new Set(campaignsOfUser)];

      for (const campaign of uniqueCampaignsOfUser) {
        if (verified) {
          // General count for this campaign
          campaignStats[campaign].verifiedUsers.count++;

          if (newsletterConsent) {
            campaignStats[campaign].usersWithNewsletterConsent.count++;
          }
        } else {
          campaignStats[campaign].unverifiedUsers.count++;
        }
      }

      // Total count
      campaignStats.totalCount.verifiedUsers++;
    } else {
      campaignStats.totalCount.unverifiedUsers++;
    }
  }

  return campaignStats;
};

const initiateCampaignStats = () => {
  return {
    verifiedUsers: {
      count: 0,
      signatures: 0,
      pledges: 0,
      downloaders: 0,
    },
    unverifiedUsers: { count: 0 },
    usersWithNewsletterConsent: {
      count: 0,
      signatures: 0,
      pledges: 0,
      downloaders: 0,
    },
    pledgesMap: {}, // how many people have pledged x signatures
  };
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

  for (const backupUser of backupUsers.Items) {
    // check if the user is already in users
    if (users.findIndex(user => user.email === backupUser.email) === -1) {
      // backup user is not already in there
      backupUser.fromBackup = true;
      users.push(backupUser);
      added++;
    }
  }

  console.log(`Added ${added} users from backup`);
  return users;
};
