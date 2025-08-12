const { SES } = require('@aws-sdk/client-ses');
const nodemailer = require('nodemailer');

const ses = new SES({
  region: 'eu-central-1',
});

module.exports.sendErrorMail = (source, error) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'There was an error',
    html: `Source: ${source}, error: ${error}`,
    to: 'valentin@expedition-grundeinkommen.de',
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};
