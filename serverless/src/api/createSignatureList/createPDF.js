const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');

module.exports = async function generatePdf(url, code, inputPDF) {
  const pdfDoc = await pdfLib.PDFDocument.load(inputPDF);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const barcode = await getBarcode(code);
  const barcodeInDocument = await pdfDoc.embedPng(barcode);
  firstPage.drawImage(barcodeInDocument, {
    x: 737,
    y: 15,
    width: 88,
    height: 38,
  });

  const qrCode = await getQrCode(url + code);
  const qrCodeInDocument = await pdfDoc.embedPng(qrCode);
  firstPage.drawImage(qrCodeInDocument, {
    x: 613,
    y: 537,
    width: 31,
    height: 31,
  });

  const pdfBytes = await pdfDoc.save();

  return pdfBytes;
};

function getBarcode(text) {
  return new Promise(resolve => {
    bwipjs.toBuffer(
      {
        bcid: 'code128',
        text: text,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center',
      },
      function(err, png) {
        if (!err) {
          resolve(png);
        }
      }
    );
  });
}

function getQrCode(text) {
  return new Promise(resolve => {
    bwipjs.toBuffer(
      {
        bcid: 'qrcode',
        text: text,
        scale: 3,
        height: 100,
        width: 100,
      },
      function(err, png) {
        if (!err) {
          resolve(png);
        }
      }
    );
  });
}
