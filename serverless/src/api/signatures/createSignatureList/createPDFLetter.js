const pdfLib = require('pdf-lib');
const fs = require('fs');
const createPDF = require('./createPDF');
const qrCodeUrls = require('./qrCodeUrls');

module.exports = async function createPDFLetter({
  lists,
  address,
  needsMailMissingAddition,
}) {
  const letter = await createPDF(
    'foo',
    'foo',
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

  for (const { campaignCode, listCount, code, state } of lists) {
    const documentType =
      campaignCode === 'schleswig-holstein-1' ? 'MULTI_SW' : 'SINGLE_SW';

    const listDoc = await createPDF(
      qrCodeUrls[state],
      code,
      documentType,
      campaignCode,
      address,
      'PDFDOC'
    );

    // for some campaign reason, in berlin the lists are on the second page
    const pageNumberOfList = campaignCode === 'berlin-1' ? 1 : 0;

    for (let i = 0; i < listCount; i++) {
      const [listPage] = await letter.copyPages(listDoc, [pageNumberOfList]);
      letter.addPage(listPage);
    }
  }
  const pdfBytes = await letter.save();
  return pdfBytes;
};
