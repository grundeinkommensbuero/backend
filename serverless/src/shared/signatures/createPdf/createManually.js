const fs = require('fs');
const { generateRandomId, constructCampaignId } = require('../../utils');
const { checkIfIdExists } = require('..');
const createSignatureList = require('../../../api/signatures/createSignatureList/createListInDynamo');
const generatePdf = require('./createPDF');

module.exports = async userId => {
  // we only want the current day (YYYY-MM-DD), then it is also easier to filter
  const timestamp = new Date().toISOString().substring(0, 10);

  const listConfig = await constructListConfig('berlin-2', 'berlin');

  generatePdf(
    'https://xbge.de/qr/hh/?listId=',
    listConfig.code,
    'SINGLE_SW',
    'berlin-2'
  ).then(pdfBytes => {
    fs.writeFileSync(
      `./lists/general/Volksentscheid Grundeinkommen Berlin ${listConfig.code}.pdf`,
      pdfBytes
    );
  });

  await createSignatureList(
    listConfig.code,
    timestamp,
    undefined,
    constructCampaignId(listConfig.campaignCode),
    true,
    false,
    userId
  );

  console.log('created list', listConfig.code, userId);
  // Remove "/" from names for saving to file
};

const constructListConfig = async (campaignCode, state, count) => {
  // because the id is quite small we need to check if the newly created one already exists (unlikely)
  let idExists = true;
  let pdfId;

  while (idExists) {
    pdfId = generateRandomId(7);
    idExists = await checkIfIdExists(pdfId);
  }

  return {
    code: pdfId,
    campaignCode,
    state,
    listCount: count,
  };
};
