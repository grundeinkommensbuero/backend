const fs = require('fs');
const {
  generateRandomId,
  constructCampaignId,
} = require('../../../shared/utils');
const { checkIfIdExists } = require('../../../shared/signatures');
const createSignatureList = require('./createListInDynamo');
const generatePdfLetter = require('./createPDFLetter');

module.exports = async (userId, user) => {
  // we only want the current day (YYYY-MM-DD), then it is also easier to filter
  const timestamp = new Date().toISOString().substring(0, 10);

  const lists = [];
  let isDuplex = false;

  if (user.countB > 0) {
    lists.push(await constructListConfig('berlin-1', user.countB));
  }

  if (user.countBB > 0) {
    lists.push(await constructListConfig('brandenburg-1', user.countBB));
    isDuplex = true;
  }

  if (user.countHH > 0) {
    lists.push(await constructListConfig('hamburg-1', user.countHH));
  }

  if (user.countSH > 0) {
    lists.push(await constructListConfig('schleswig-holstein-1', user.countSH));
  }

  const mailMissing =
    user.email === 'postbrief-april-ohne-mail@expedition-grundeinkommen.de';

  const pdfBytes = await generatePdfLetter({
    lists,
    address: user.address,
    needsMailMissingAddition: mailMissing,
  });

  for (const list of lists) {
    await createSignatureList(
      list.code,
      timestamp,
      undefined,
      constructCampaignId(list.campaignCode),
      true,
      mailMissing,
      userId
    );
  }

  // Remove "/" from names for saving to file
  user.address.name = user.address.name.replace('/', '');

  fs.writeFileSync(
    `./lists/${isDuplex ? 'duplex' : 'simplex'}/${
      user.needsEnvelope ? 'envelope' : 'no-envelope'
    }/list_${user.address.name}.pdf`,
    pdfBytes
  );
};

const constructListConfig = async (campaignCode, count) => {
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
    listCount: count,
  };
};
