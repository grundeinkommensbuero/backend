const fs = require('fs');

const generatePdf = require('./createPDF');

const CODE = '0123456789';
const URL = 'https://xbge.de/qr/hh/?listId=';

generatePdf(URL, CODE, 'SINGLE_SW', 'berlin-1', {
  name: 'Max Musterfrau',
  street: 'Am Fleet 2',
  zipCode: '21333',
  city: 'Hamburg',
}).then(pdfBytes => {
  fs.writeFileSync('./test-serienbrief.pdf', pdfBytes);
});
