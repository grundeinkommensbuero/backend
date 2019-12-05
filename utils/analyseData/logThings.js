const { analyseData } = require('./analyseData');
const { generateCsv } = require('./generateCsv');

const runScript = async () => {
  const stats = await analyseData();
  console.log('Campaign stats:');
  console.log(stats);

  generateCsv(stats, 'schleswig-holstein-1');
  generateCsv(stats, 'brandenburg-1');
};

runScript();
