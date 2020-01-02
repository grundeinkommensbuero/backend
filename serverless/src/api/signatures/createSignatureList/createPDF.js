const fs = require('fs');
const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');

const inputPdfs = {
  COMBINED: fs.readFileSync(__dirname + '/pdf/sh-1/ALLES_sw.pdf'),
  SINGLE_SW: fs.readFileSync(__dirname + '/pdf/sh-1/1er_sw.pdf'),
  MULTI_SW: fs.readFileSync(__dirname + '/pdf/sh-1/5er_sw.pdf'),
  SINGLE: fs.readFileSync(__dirname + '/pdf/sh-1/1er.pdf'),
  MULTI: fs.readFileSync(__dirname + '/pdf/sh-1/5er.pdf'),
};

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

module.exports = async function generatePdf(url, code, type) {
  console.log('generating pdf...');
  const pdfDoc = await pdfLib.PDFDocument.load(inputPdfs[type]);

  const pages = pdfDoc.getPages();

  const barcode = await getBarcode(code);

  const barcodeInDocument = await pdfDoc.embedPng(barcode);

  const qrCode = await getQrCode(url + code);
  const qrCodeInDocument = await pdfDoc.embedPng(qrCode);

  if (type === 'COMBINED') {
    pages[1].drawImage(barcodeInDocument, CODE_POSITIONS.BARCODE_SINGLE);
    pages[1].drawImage(qrCodeInDocument, CODE_POSITIONS.QRCODE_SINGLE);
    pages[2].drawImage(barcodeInDocument, CODE_POSITIONS.BARCODE_MULTI);
    pages[2].drawImage(qrCodeInDocument, CODE_POSITIONS.QRCODE_MULTI);
  }

  if (type === 'SINGLE' || type === 'SINGLE_SW') {
    pages[0].drawImage(barcodeInDocument, CODE_POSITIONS.BARCODE_SINGLE);
    pages[0].drawImage(qrCodeInDocument, CODE_POSITIONS.QRCODE_SINGLE);
  }

  if (type === 'MULTI' || type === 'MULTI_SW') {
    pages[0].drawImage(barcodeInDocument, CODE_POSITIONS.BARCODE_MULTI);
    pages[0].drawImage(qrCodeInDocument, CODE_POSITIONS.QRCODE_MULTI);
  }

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
