const fs = require('fs');

const generatePdf = require('./createPDF');

const inputPDF = fs.readFileSync('./list_sh.pdf');
const CODE = '0123456789';
const URL = 'https://xbge.de/scan?id=';

generatePdf(URL, CODE, inputPDF).then(pdfBytes => {
  fs.writeFileSync('./list_sh-out.pdf', pdfBytes);
});
