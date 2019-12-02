const fs = require('fs');

const generatePdf = require('./createPDF');

const inputPDF = fs.readFileSync('./list_sh.pdf');
const CODE = '0123456789';
const URL = 'https://xbge.de/qr/sh/?listId=';

generatePdf(URL, CODE, inputPDF).then(pdfBytes => {
  fs.writeFileSync('./list_sh-out.pdf', pdfBytes);
});
