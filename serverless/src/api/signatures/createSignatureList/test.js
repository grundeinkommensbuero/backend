const fs = require('fs');

const generatePdf = require('./createPDF');

const CODE = '0123456789';
const URL = 'https://xbge.de/qr/hh/?listId=';

generatePdf(URL, CODE, 'SINGLE_SW', 'hamburg-1').then(pdfBytes => {
  fs.writeFileSync('./list_sh-out.pdf', pdfBytes);
});
