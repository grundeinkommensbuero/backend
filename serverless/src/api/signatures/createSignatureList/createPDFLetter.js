const pdfLib = require('pdf-lib');
const fs = require('fs');
const createPDF = require('./createPDF');
const qrCodeUrls = require('./qrCodeUrls');

module.exports = async function createPDFLetter({
  lists,
  address,
  needsMailMissingAddition,
  isDuplex,
  isBBPlatform,
}) {
  const letter = await createPDF(
    'foo',
    'foo',
    isBBPlatform ? 'ANSCHREIBEN_BB_PLATTFORM' : 'ANSCHREIBEN_GENERAL',
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

  for (const [
    index,
    { campaignCode, listCount, code, state },
  ] of lists.entries()) {
    let documentType;

    if (campaignCode === 'schleswig-holstein-1') {
      documentType = 'MULTI_SW';
    } else if (campaignCode === 'brandenburg-1' || campaignCode === 'dibb-1') {
      documentType = 'SINGLE_SW_ROTATED_LAW_FOR_PIN';
    } else {
      documentType = 'SINGLE_SW';
    }

    // If Bremen we want to add the gesetzestext before the lists
    if (campaignCode === 'bremen-1') {
      // Only add the empty page, if it is not the first list
      if (index !== 0) {
        letter.addPage();
      }

      const lawBytes = fs.readFileSync(`${__dirname}/pdf/bremen-1/GESETZ.pdf`);
      const lawDoc = await pdfLib.PDFDocument.load(lawBytes);
      const copiedPages = await letter.copyPages(
        lawDoc,
        lawDoc.getPageIndices()
      );

      for (const page of copiedPages) {
        letter.addPage(page);
      }
    }

    let listDoc;
    // For the lists of Verkehrswende and Klimanotstand we don't
    // need to generate a list with codes
    if (campaignCode === 'verkehrswende-1') {
      const bytes = fs.readFileSync(
        `${__dirname}/pdf/dibb-1/VERKEHRSWENDE.pdf`
      );
      listDoc = await pdfLib.PDFDocument.load(bytes);
    } else if (campaignCode === 'klimanotstand-1') {
      const bytes = fs.readFileSync(
        `${__dirname}/pdf/dibb-1/KLIMANOTSTAND.pdf`
      );
      listDoc = await pdfLib.PDFDocument.load(bytes);
    } else {
      listDoc = await createPDF(
        qrCodeUrls[state],
        code,
        documentType,
        campaignCode,
        address,
        'PDFDOC'
      );
    }

    // for some campaign reason, in berlin the lists are on the second page
    const pageNumberOfList = campaignCode === 'berlin-1' ? 1 : 0;

    for (let i = 0; i < listCount; i++) {
      // Bremen is printed duplex, but we don't want empty pages in between
      if (
        isDuplex &&
        campaignCode !== 'bremen-1' &&
        letter.getPageCount() % 2
      ) {
        letter.addPage();
      }

      const [listPage] = await letter.copyPages(listDoc, [pageNumberOfList]);
      letter.addPage(listPage);

      if (campaignCode === 'brandenburg-1' || campaignCode === 'dibb-1') {
        // needs the gesetzestext on the back side if it is brandenburg
        const [lawPage] = await letter.copyPages(listDoc, [1]);
        letter.addPage(lawPage);
      }
    }
  }

  const pdfBytes = await letter.save();
  return pdfBytes;
};
