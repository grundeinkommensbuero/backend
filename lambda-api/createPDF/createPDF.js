const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');

module.exports = async function generatePdf(url, code, inputPDF) {
  const pdfDoc = await pdfLib.PDFDocument.load(inputPDF);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const barcode = await getBarcode(code);
  const barcodeInDocument = await pdfDoc.embedPng(barcode);
  firstPage.drawImage(barcodeInDocument, {
    x: 500,
    y: 50,
    width: 40,
    height: 90,
  });

  const qrCode = await getQrCode(url + code);
  const qrCodeInDocument = await pdfDoc.embedPng(qrCode);
  firstPage.drawImage(qrCodeInDocument, {
    x: 400,
    y: 50,
    width: 90,
    height: 90,
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
        rotate: 'R',
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
