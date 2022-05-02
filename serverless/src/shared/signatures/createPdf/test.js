const fs = require('fs');

// const createPDFLetter = require('./createPDFLetter');
const generatePdf = require('./createPDF');

const CODE = '0123456';
const URL = 'https://xbge.de/qr/hh/?listId=';

generatePdf(URL, CODE, 'SINGLE_SW', 'berlin-2').then(pdfBytes => {
  fs.writeFileSync('./test-berlin.pdf', pdfBytes);
});

/*
createPDFLetter({
  url: URL,
  code: CODE,
  lists: [
    {
      campaignCode: 'brandenburg-1',
      state: 'brandenburg',
      listCount: 2,
      code: '43234',
    },
    {
      campaignCode: 'berlin-1',
      state: 'berlin',
      listCount: 2,
      code: '43234',
    },
    {
      campaignCode: 'bremen-1',
      state: 'bremen',
      listCount: 2,
      code: '22234',
    },
  ],
  address: {
    name: 'Max Musterfrau',
    street: 'Am Fleet 2',
    zipCode: '21333',
    city: 'Hamburg',
  },
  isDuplex: true,
  isBBPlatform: true,
}).then(pdfBytes => {
  fs.writeFileSync('./test-serienbrief.pdf', pdfBytes);
});
*/
