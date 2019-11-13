const generatePdf = require('./createPDF');
const fs = require('fs');
const AWS = require('aws-sdk');
const S3 = new AWS.S3();

const inputPDF = fs.readFileSync(__dirname + '/test-list.pdf');
const URL = 'https://expedition-grundeinkommen.de/scan?id=';

exports.handler = async event => {
  console.log(event);
  const pdfId = event.pathParameters.pdfId;
  const generatedPdf = await generatePdf(URL, pdfId, inputPDF);

  //upload file to S3
  try {
    const result = await S3.upload({
      Bucket: 'signature-lists',
      Key: `${pdfId}.pdf`,
      Body: Buffer.from(generatedPdf),
      ContentType: 'application/pdf',
    }).promise();
    console.log('success uploading pdf to bucket', result);
    return response(201, 'Created PDF and uploaded it to bucket', {
      id: pdfId,
      url: result.Location,
    });
  } catch (error) {
    console.log('error uploading pdf to bucket', error);
    return response(500, error);
  }
};

const response = (statusCode, message, signatureList = null) => {
  const data = { message: message };
  if (signatureList !== null) {
    data.signatureList = signatureList;
  }
  return {
    statusCode: statusCode,
    body: JSON.stringify(data),
    isBase64Encoded: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-type': 'application/json',
    },
  };
};
