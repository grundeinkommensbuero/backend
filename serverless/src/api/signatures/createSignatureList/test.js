const fs = require('fs');

const generatePdf = require('./createPDF');
const createPDFLetter = require('./createPDFLetter');

const CODE = '0123456789';
const URL = 'https://xbge.de/qr/hh/?listId=';

// generatePdf(URL, CODE, 'COMBINED', 'bremen-1').then(pdfBytes => {
//   fs.writeFileSync('./test-dibb.pdf', pdfBytes);
// });

createPDFLetter({
  url: URL,
  code: CODE,
  lists: [
    {
      campaignCode: 'bremen-1',
      state: 'bremen',
      listCount: 1,
      code: '43234',
    },
    {
      campaignCode: 'bremen-1',
      state: 'bremen',
      listCount: 1,
      code: '12234',
    },
  ],
  address: {
    name: 'Max Musterfrau',
    street: 'Am Fleet 2',
    zipCode: '21333',
    city: 'Hamburg',
  },
}).then(pdfBytes => {
  fs.writeFileSync('./test-serienbrief.pdf', pdfBytes);
});
