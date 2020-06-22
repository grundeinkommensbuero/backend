const {
  analyseUsers,
} = require('../../serverless/src/api/users/getUserCount/analyseUsers');
const {
  analyseSignatureLists,
} = require('../../serverless/src/api/signatures/getSignatureListCount/analyseSignatureLists');
// const { generateCsv } = require('./generateCsv');
const Table = require('cli-table3');

const runScript = async () => {
  // Users stats
  const statsUsers = await analyseUsers();

  const tableUsers = new Table({
    head: [
      '',
      'Users Count',
      'Users Signatures',
      'Users Count (with NLc)',
      'Users Signatures (with NLc)',
      'unverified Users',
    ],
  });

  for (const campaignKey in statsUsers) {
    if (Object.prototype.hasOwnProperty.call(statsUsers, campaignKey)) {
      const campaign = statsUsers[campaignKey];
      tableUsers.push({
        [campaignKey]: [
          campaign.verifiedUsers.count,
          campaign.verifiedUsers.signatures,
          campaign.usersWithNewsletterConsent.count,
          campaign.usersWithNewsletterConsent.signatures,
          campaign.unverifiedUsers.count,
        ],
      });
    }
  }

  // Signature Lists Stats
  const statsLists = await analyseSignatureLists();

  const tableLists = new Table({
    head: [
      '',
      'Lists Total Count',
      'Lists Total Downloads',
      'Lists Anonymous Count',
      'Lists Anonymous Downloads',
      'Lists by User Count',
      'Lists by User Downloads',
    ],
  });

  for (const campaignKey in statsLists) {
    if (Object.prototype.hasOwnProperty.call(statsLists, campaignKey)) {
      const campaign = statsLists[campaignKey];
      tableLists.push({
        [campaignKey]: [
          campaign.total.lists,
          campaign.total.downloads,
          campaign.anonymous.lists,
          campaign.anonymous.downloads,
          campaign.byUser.lists,
          campaign.byUser.downloads,
        ],
      });
    }
  }

  console.log('');
  console.log('USER STATISTICS 👩‍💼🙍‍♂️');
  console.log('Unverfied Users not included in count');
  console.log(tableUsers.toString());

  console.log('');
  console.log('SIGNATURE LISTS STATISTICS 👩‍💼🙍‍♂️');
  console.log(tableLists.toString());

  //   generateCsv(stats, 'schleswig-holstein-1');
  //   generateCsv(stats, 'brandenburg-1');
};

runScript();
