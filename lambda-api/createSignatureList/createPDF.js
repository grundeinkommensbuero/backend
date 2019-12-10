const fs = require('fs');
const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');

const inputPdfCombined = fs.readFileSync(__dirname + '/pdf/sh-1/ALLES.pdf');

const CODE_POSITIONS = {
  BARCODE_SINGLE: {
    x: 752,
    y: 28,
    width: 85,
    height: 37,
  },
  QRCODE_SINGLE: {
    x: 687,
    y: 449,
    width: 39,
    height: 39,
  },
  BARCODE_MULTI: {
    x: 535,
    y: 20,
    width: 90,
    height: 40,
  },
  QRCODE_MULTI: {
    x: 685,
    y: 464,
    width: 39,
    height: 39,
  },
};

module.exports = async function generatePdfCombined(url, code) {
  const pdfDoc = await pdfLib.PDFDocument.load(inputPdfCombined);

  const pages = pdfDoc.getPages();

  const barcode = await getBarcode(code);
  const barcodeInDocument = await pdfDoc.embedPng(barcode);

  const qrCode = await getQrCode(url + code);
  const qrCodeInDocument = await pdfDoc.embedPng(qrCode);

  pages[1].drawImage(barcodeInDocument, CODE_POSITIONS.BARCODE_SINGLE);
  pages[1].drawImage(qrCodeInDocument, CODE_POSITIONS.QRCODE_SINGLE);

  pages[2].drawImage(barcodeInDocument, CODE_POSITIONS.BARCODE_MULTI);
  pages[2].drawImage(qrCodeInDocument, CODE_POSITIONS.QRCODE_MULTI);

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
