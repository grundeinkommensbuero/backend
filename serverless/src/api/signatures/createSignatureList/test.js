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
  listCounts: [
    {
      campaignCode: 'brandenburg-1',
      listCount: 1,
    },
    {
      campaignCode: 'berlin-1',
      listCount: 2,
    },
  ],
  address: {
    name: 'Max Musterfrau',
    street: 'Am Fleet 2',
    zipCode: '21333',
    city: 'Hamburg',
  },
  needsMailMissingAddition: false,
}).then(pdfBytes => {
  fs.writeFileSync('./test-serienbrief.pdf', pdfBytes);
});
