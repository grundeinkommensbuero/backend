const fs = require('fs');

const generatePdfCombined = require('./createPDF');

const CODE = '0123456789';
const URL = 'https://xbge.de/qr/sh/?listId=';

generatePdfCombined(URL, CODE).then(pdfBytes => {
  fs.writeFileSync('./list_sh-out.pdf', pdfBytes);
});
