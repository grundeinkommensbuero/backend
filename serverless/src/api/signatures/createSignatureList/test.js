const fs = require('fs');

const generatePdf = require('./createPDF');
const createPDFLetter = require('./createPDFLetter');

const CODE = '0123456789';
const URL = 'https://xbge.de/qr/hh/?listId=';

// generatePdf(URL, CODE, 'ANSCHREIBEN_GENERAL', 'hamburg-1', {
//   name: 'Max Musterfrau',
//   street: 'Am Fleet 2',
//   zipCode: '21333',
//   city: 'Hamburg',
// }).then(pdfBytes => {
//   fs.writeFileSync('./test-serienbrief.pdf', pdfBytes);
// });

createPDFLetter({
  url: URL,
  code: CODE,
  campaignCode: 'brandenburg-1',
  address: {
    name: 'Max Musterfrau',
    street: 'Am Fleet 2',
    zipCode: '21333',
    city: 'Hamburg',
  },
  needsMailMissingAddition: false,
  listCount: 1,
}).then(pdfBytes => {
  fs.writeFileSync('./test-serienbrief.pdf', pdfBytes);
});
