const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES();

//Functions which sends an email with the attached pdf and returns a promise
const sendMail = (email, pdf) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Deine Unterschriftenliste',
    html: `<p>Hallo, hier ist deine Unterschriftenliste`,
    to: email,
    attachments: [
      {
        filename: 'Unterschriftenliste.pdf',
        content: Buffer.from(pdf, 'base64'),
        contentType: 'application/pdf',
      },
    ],
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

module.exports = sendMail;
