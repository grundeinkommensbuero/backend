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
  let isBBPlatform = false;
  console.log(user);

  if (user.countB > 0) {
    lists.push(await constructListConfig('berlin-1', 'berlin', user.countB));
  }

  if (user.countBB > 0) {
    lists.push(
      await constructListConfig('brandenburg-1', 'brandenburg', user.countBB)
    );
    isDuplex = true;
  }

  if (user.countHH > 0) {
    lists.push(await constructListConfig('hamburg-1', 'hamburg', user.countHH));
  }

  if (user.countSH > 0) {
    lists.push(
      await constructListConfig(
        'schleswig-holstein-1',
        'schleswig-holstein',
        user.countSH
      )
    );
  }

  if (user.countHB > 0) {
    lists.push(await constructListConfig('bremen-1', 'bremen', user.countHB));
    isDuplex = true;
  }

  if (user.countDibb > 0) {
    lists.push(await constructListConfig('dibb-1', 'dibb', user.countDibb));
    isDuplex = true;
    isBBPlatform = true;
  }

  if (user.countVerkehrswende > 0) {
    lists.push({
      campaignCode: 'verkehrswende-1',
      listCount: user.countVerkehrswende,
    });
    isDuplex = true;
    isBBPlatform = true;
  }

  if (user.countVerkehrswende > 0) {
    lists.push({
      campaignCode: 'klimanotstand-1',
      listCount: user.countKlimanotstand,
    });
    isDuplex = true;
    isBBPlatform = true;
  }

  const mailMissing =
    user.email === 'postbrief-april-ohne-mail@expedition-grundeinkommen.de';

  const pdfBytes = await generatePdfLetter({
    lists,
    address: user.address,
    needsMailMissingAddition: mailMissing,
    isDuplex,
    isBBPlatform,
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
