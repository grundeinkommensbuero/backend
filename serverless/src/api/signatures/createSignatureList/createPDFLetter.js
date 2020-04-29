const pdfLib = require('pdf-lib');
const fs = require('fs');
const createPDF = require('./createPDF');

module.exports = async function createPDFLetter({
  url,
  code,
  campaignCode,
  listCount,
  address,
  needsMailMissingAddition,
}) {
  const letter = await createPDF(
    url,
    code,
    'ANSCHREIBEN_GENERAL',
    'anschreiben',
    address,
    'PDFDOC'
  );

  if (needsMailMissingAddition) {
    const mailMissingAdditionBytes = fs.readFileSync(
      __dirname + '/pdf/letters/BEILAGE_MAIL_FEHLT.pdf'
    );
    const mailMissingAdditionDoc = await pdfLib.PDFDocument.load(
      mailMissingAdditionBytes
    );
    const [
      mailMissingAdditionPage,
    ] = await letter.copyPages(mailMissingAdditionDoc, [0]);
    letter.addPage(mailMissingAdditionPage);
  }

  const listDoc = await createPDF(
    url,
    code,
    'SINGLE_SW',
    campaignCode,
    address,
    'PDFDOC'
  );

  // for some campaign reason, in berlin the lists are on the second page
  const pageNumberOfList = campaignCode === 'berlin-1' ? 1 : 0;

  const [listPage] = await letter.copyPages(listDoc, [pageNumberOfList]);

  for (let i = 0; i < listCount; i++) {
    letter.addPage(listPage);
  }

  const pdfBytes = await letter.save();
  return pdfBytes;
};
