const { analyseUsers } = require('./analyseUsers');
const { analyseSignatureLists } = require('./analyseSignatureLists');
const { generateCsv } = require('./generateCsv');
var Table = require('cli-table3');

const runScript = async () => {
  const statsUsers = await analyseUsers();

  console.log('Unverfied Users not included in count');

  tableUsers = new Table({
    head: [
      '',
      'Users Count',
      'Users Signatures',
      'Users Count (without NLc)',
      'Users Signatures (without NLc)',
      'unverified Users',
    ],
  });

  for (let campaignKey in statsUsers) {
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

  const statsLists = await analyseSignatureLists();

  console.log('');
  console.log('SIGNATURE LISTS STATISTICS 👩‍💼🙍‍♂️');

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

  for (let campaignKey in statsLists) {
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

  console.log(tableUsers.toString());
  console.log(tableLists.toString());

  //   generateCsv(stats, 'schleswig-holstein-1');
  //   generateCsv(stats, 'brandenburg-1');
};

runScript();
