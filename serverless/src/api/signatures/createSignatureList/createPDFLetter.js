const pdfLib = require('pdf-lib');
const fs = require('fs');
const createPDF = require('./createPDF');
const qrCodeUrls = require('./qrCodeUrls');

module.exports = async function createPDFLetter({
  lists,
  address,
  needsMailMissingAddition,
}) {
  const isDuplex = !!lists.find(
    ({ campaignCode }) => campaignCode === 'brandenburg-1'
  );

  const letter = await createPDF(
    'foo',
    'foo',
    'ANSCHREIBEN_GENERAL',
    'anschreiben',
    address,
    'PDFDOC'
  );

  if (needsMailMissingAddition) {
    if (isDuplex) {
      letter.addPage();
    }

    const mailMissingAdditionBytes = fs.readFileSync(
      `${__dirname}/pdf/letters/BEILAGE_MAIL_FEHLT.pdf`
    );
    const mailMissingAdditionDoc = await pdfLib.PDFDocument.load(
      mailMissingAdditionBytes
    );
    const [
      mailMissingAdditionPage,
    ] = await letter.copyPages(mailMissingAdditionDoc, [0]);
    letter.addPage(mailMissingAdditionPage);
  } else if (isDuplex) {
    letter.addPage();
  }

  for (const { campaignCode, listCount, code, state } of lists) {
    let documentType;

    if (campaignCode === 'schleswig-holstein-1') {
      documentType = 'MULTI_SW';
    } else if (campaignCode === 'brandenburg-1') {
      documentType = 'SINGLE_SW_ROTATED_LAW_FOR_PIN';
    } else {
      documentType = 'SINGLE_SW';
    }

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
      if (isDuplex && letter.getPageCount() % 2) {
        letter.addPage();
      }

      const [listPage] = await letter.copyPages(listDoc, [pageNumberOfList]);
      letter.addPage(listPage);

      if (campaignCode === 'brandenburg-1') {
        // needs the gesetzestext on the back side if it is brandenburg
        const [lawPage] = await letter.copyPages(listDoc, [1]);
        letter.addPage(lawPage);
      }
    }
  }
  const pdfBytes = await letter.save();
  return pdfBytes;
};
