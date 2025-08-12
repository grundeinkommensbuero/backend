const {
  CognitoIdentityProvider,
} = require('@aws-sdk/client-cognito-identity-provider');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');

const nodemailer = require('nodemailer');
const crypto = require('crypto-secure-random-digit');

const sesClient = new SESv2Client({ region: 'eu-central-1' });

const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

const cognito = new CognitoIdentityProvider();
const mail = require('raw-loader!./loginCodeMail.html').default;
const { errorResponse } = require('../../../shared/apiResponse');
const { getUser, createLoginCode } = require('../../../shared/users');
const { sendErrorMail } = require('../../../shared/errorHandling');

module.exports.handler = async event => {
  try {
    // Either userId or email was passed in body
    const { email, userId } = JSON.parse(event.body);

    if (typeof email === 'undefined' && typeof userId === 'undefined') {
      return errorResponse(400, 'Missing email or username');
    }

    // Store challenge as a custom attribute in Cognito
    // Generate a new secret login code and mail it to the user
    const secretLoginCode = await createLoginCode({ email, userId });

    let emailTo = email;
    // If param was userId and not email we need to get the email to send an email with code
    if (typeof email === 'undefined') {
      const { Item } = await getUser(userId);

      emailTo = Item.email;
    }

    await sendEmailViaSes(emailTo, secretLoginCode);

    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error signing in', error, event.body);
    if (error.code === 'UserNotFoundException') {
      return errorResponse(404, 'User not found');
    }

    await sendErrorMail('sign in', error);
    return errorResponse(500, 'Error while signing in user', error);
  }
};

const sendEmailViaSes = (email, code) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de>',
    subject: `Dein geheimer Login-Code: ${code}`,
    html: customEmail(email, code),
    to: email,
  };

  return transporter.sendMail(mailOptions);
};

const customEmail = (email, code) => {
  if (!mail) {
    throw new Error('Html Mail not provided');
  }

  return mail
    .replace(/\[\[CODE\]\]/gi, code)
    .replace(/\[\[EMAIL_TO\]\]/gi, email);
};
