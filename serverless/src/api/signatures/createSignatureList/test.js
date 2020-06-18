const fs = require('fs');

// const generatePdf = require('./createPDF');
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
  lists: [
    {
      campaignCode: 'brandenburg-1',
      state: 'brandenburg',
      listCount: 1,
      code: '43234',
    },
    {
      campaignCode: 'berlin-1',
      state: 'berlin',
      listCount: 2,
      code: '12345',
    },
    {
      campaignCode: 'schleswig-holstein-1',
      state: 'schleswig-holstein',
      listCount: 2,
      code: '12345',
    },
  ],
  address: {
    name: 'Max Musterfrau',
    street: 'Am Fleet 2',
    zipCode: '21333',
    city: 'Hamburg',
  },
  needsMailMissingAddition: true,
}).then(pdfBytes => {
  fs.writeFileSync('./test-serienbrief.pdf', pdfBytes);
});
