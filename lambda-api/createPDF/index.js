const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');
const fs = require('fs');

const existingPdfBytes = fs.readFileSync('./test-list.pdf');

const CODE = '0123456789';
const URL = 'https://expedition-grundeinkommen.de/scan?id=';

async function generatePdf() {
  const pdfDoc = await pdfLib.PDFDocument.load(existingPdfBytes);

  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const barcode = await getBarcode(CODE);
  const barcodeInDocument = await pdfDoc.embedPng(barcode);
  firstPage.drawImage(barcodeInDocument, {
    x: 500,
    y: 50,
    width: 40,
    height: 90,
  });

  const qrCode = await getQrCode(URL + CODE);
  const qrCodeInDocument = await pdfDoc.embedPng(qrCode);
  firstPage.drawImage(qrCodeInDocument, {
    x: 400,
    y: 50,
    width: 90,
    height: 90,
  });

  const pdfBytes = await pdfDoc.save();

  fs.writeFileSync('./test-list-out.pdf', pdfBytes);
}

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

generatePdf();
