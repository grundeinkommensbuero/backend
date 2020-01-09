const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');
const inputPdfs = require('./inputPdfs');

module.exports = async function generatePdf(url, code, type, campaignCode) {
  console.log('generating pdf...');
  const pdfDoc = await pdfLib.PDFDocument.load(
    inputPdfs[campaignCode][type].file
  );

  const pages = pdfDoc.getPages();

  const barcode = await getBarcode(code);
  const barcodeInDocument = await pdfDoc.embedPng(barcode);

  const qrCode = await getQrCode(url + code);
  const qrCodeInDocument = await pdfDoc.embedPng(qrCode);

  inputPdfs[campaignCode][type].codes.forEach(codeInfo => {
    const codeImage =
      codeInfo.type === 'BAR' ? barcodeInDocument : qrCodeInDocument;
    pages[codeInfo.page].drawImage(codeImage, codeInfo.position);
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};

function getBarcode(text) {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text: text,
    scale: 3,
    height: 10,
    includetext: true,
    textxalign: 'center',
  });
}

function getQrCode(text) {
  return bwipjs.toBuffer({
    bcid: 'qrcode',
    text: text,
    scale: 3,
    height: 100,
    width: 100,
  });
}
