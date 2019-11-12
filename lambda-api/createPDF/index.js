const generatePdf = require('./createPDF');
const fs = require('fs');

const inputPDF = fs.readFileSync(__dirname + '/test-list.pdf');
const URL = 'https://expedition-grundeinkommen.de/scan?id=';

exports.handler = async event => {
  console.log(event);
  const pdfId = event.pathParameters.pdfId;
  const generatedPdf = await generatePdf(URL, pdfId, inputPDF);

  return {
    statusCode: 200,
    body: generatedPdf.toString('base64'),
    isBase64Encoded: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-type': 'application/pdf',
    },
  };
};
