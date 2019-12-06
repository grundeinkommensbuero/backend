const { analyseData } = require('./analyseData');
const { generateCsv } = require('./generateCsv');
var Table = require('cli-table3');

const runScript = async () => {
  const stats = await analyseData();

  console.log('');
  console.log('USER STATISTICS 👩‍💼🙍‍♂️');
  console.log('Unverfied Users not included in count');

  var table = new Table({
    head: [
      '',
      'Users Count',
      'Users Signatures',
      'Users Count (without NLc)',
      'Users Signatures (without NLc)',
      'unverified Users',
    ],
  });

  for (let campainKey in stats) {
    const campain = stats[campainKey];
    table.push({
      [campainKey]: [
        campain.verifiedUsers.count,
        campain.verifiedUsers.signatures,
        campain.usersWithNewsletterConsent.count,
        campain.usersWithNewsletterConsent.signatures,
        campain.unverifiedUsers.count,
      ],
    });
  }
  console.log(table.toString());

  //   generateCsv(stats, 'schleswig-holstein-1');
  //   generateCsv(stats, 'brandenburg-1');
};

runScript();
