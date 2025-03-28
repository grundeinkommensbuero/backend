const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');
const inputPdfs = require('./inputPdfs');

// Generates pdfs by creating barcodes and qr codes with the passed code
// and adds those to the pdf using pdf-lib.
// The config for where the qr and barcodes should be places can be found
// in ./inputPdfs.
module.exports = async function generatePdf(
  url,
  code,
  type,
  campaignCode,
  address,
  format
) {
  console.log('generating pdf...');
  const pdfDoc = await pdfLib.PDFDocument.load(
    inputPdfs[campaignCode][type].file
  );

  const font = await pdfDoc.embedFont(pdfLib.StandardFonts.Helvetica);

  const pages = pdfDoc.getPages();

  const barcode = await getBarcode(code);
  const barcodeInDocument = await pdfDoc.embedPng(barcode);

  const qrCode = await getQrCode(url + code);
  const qrCodeInDocument = await pdfDoc.embedPng(qrCode);

  inputPdfs[campaignCode][type].codes.forEach(codeInfo => {
    if (codeInfo.type === 'BAR') {
      pages[codeInfo.page].drawImage(barcodeInDocument, codeInfo.position);
    }
    if (codeInfo.type === 'QR') {
      pages[codeInfo.page].drawImage(qrCodeInDocument, codeInfo.position);
    }
    if (codeInfo.type === 'ADDRESS') {
      const textProps = codeInfo.position;
      textProps.font = font;
      textProps.color = pdfLib.rgb(0, 0, 0);
      textProps.size = 12;
      textProps.lineHeight = 15;
      pages[codeInfo.page].drawText(getAddressString(address), textProps);
    }
  });

  if (format === 'PDFDOC') {
    return pdfDoc;
  }

  return await pdfDoc.save();
};

function getBarcode(text) {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text,
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: 'center',
    backgroundcolor: 'ffffff',
  });
}

function getQrCode(text) {
  return bwipjs.toBuffer({
    bcid: 'qrcode',
    text,
    scale: 3,
    height: 100,
    width: 100,
    backgroundcolor: 'ffffff',
  });
}

function getAddressString({ name, street, zipCode, city }) {
  return `${name}
${street}
${zipCode} ${city}`;
}
