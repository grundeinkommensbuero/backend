const fs = require('fs');
const { generateRandomId } = require('../../../shared/utils');
const { createSignatureList, uploadPDF } = require('./');
const generatePdf = require('./createPDF');

const URL = 'https://xbge.de/qr/bb/?listId=';
const CAMPAIGN = 'brandenburg-1';
const USER_ID = '03f14bbb-92ec-4ff4-8ad3-8bf01473a7c0';
const NAME = 'vali';

createListManually = async () => {
  //we only want the current day (YYYY-MM-DD), then it is also easier to filter
  const timestamp = new Date().toISOString().substring(0, 10);
  const pdfId = generateRandomId(7);

  console.log('pdf id', pdfId);

  const pdfBytes = await generatePdf(URL, pdfId, 'COMBINED', 'brandenburg-1');

  const { Location } = await uploadPDF(pdfId, pdfBytes);
  await createSignatureList(pdfId, timestamp, Location, CAMPAIGN, USER_ID);

  fs.writeFileSync(`./list_bb_${NAME}.pdf`, pdfBytes);
};

createListManually();
