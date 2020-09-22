const generatePdf = require('./createPDF');

const getAttachment = async (attachment, qrCodeUrl, pdfId, campaignCode) => {
  let file = attachment.file;

  if (!file) {
    file = await generatePdf(qrCodeUrl, pdfId, attachment.type, campaignCode);
  }

  return Promise.resolve({
    Filename: attachment.filename,
    Base64Content: Buffer.from(file).toString('base64'),
    ContentType: 'application/pdf',
  });
};

module.exports = (attachments, qrCodeUrl, pdfId, campaignCode) => {
  return Promise.all(
    attachments.map(attachment =>
      getAttachment(attachment, qrCodeUrl, pdfId, campaignCode)
    )
  );
};
