const fs = require('fs');

const generatePdf = require('./createPDF');

const inputPDF = fs.readFileSync('./test-list.pdf');
const CODE = '0123456789';
const URL = 'https://expedition-grundeinkommen.de/scan?id=';

generatePdf(URL, CODE, inputPDF).then(pdfBytes => {
  fs.writeFileSync('./test-list-out.pdf', pdfBytes);
});
