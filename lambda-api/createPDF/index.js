const pdfLib = require('pdf-lib');
const bwipjs = require('bwip-js');
const fs = require('fs');

const existingPdfBytes = fs.readFileSync('./test-list.pdf');

const CODE = '0123456789';
const URL = 'https://expedition-grundeinkommen.de/scan?id=';

function getBarcode(text) {
  return new Promise(resolve => {
    bwipjs.toBuffer(
      {
        bcid: 'code128', // Barcode type
        text: text, // Text to encode
        scale: 3, // 3x scaling factor
        height: 10, // Bar height, in millimeters
        includetext: true, // Show human-readable text
        textxalign: 'center', // Always good to set this
        rotate: 'R',
      },
      function(err, png) {
        if (err) {
          // Decide how to handle the error
          // `err` may be a string or Error object
        } else {
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
        bcid: 'qrcode', // Barcode type
        text: text, // Text to encode
        scale: 3, // 3x scaling factor
        height: 100, // Bar height, in millimeters
        width: 100, // Bar height, in millimeters
      },
      function(err, png) {
        if (err) {
          // Decide how to handle the error
          // `err` may be a string or Error object
        } else {
          resolve(png);
        }
      }
    );
  });
}

async function test() {
  // Load a PDFDocument from the existing PDF bytes
  const pdfDoc = await pdfLib.PDFDocument.load(existingPdfBytes);

  // Get the first page of the document
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

  // Serialize the PDFDocument to bytes (a Uint8Array)
  const pdfBytes = await pdfDoc.save();

  fs.writeFileSync('./test-list-out.pdf', pdfBytes);
}

test();
