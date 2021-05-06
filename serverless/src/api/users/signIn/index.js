const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const crypto = require('crypto-secure-random-digit');

const ses = new AWS.SES();
const cognito = new AWS.CognitoIdentityServiceProvider();
const mail = require('raw-loader!./loginCodeMail.html').default;
const { errorResponse } = require('../../../shared/apiResponse');

module.exports.handler = async event => {
  try {
    const { email } = JSON.parse(event.body);

    // Store challenge as a custom attribute in Cognito
    // Generate a new secret login code and mail it to the user
    const secretLoginCode = crypto.randomDigits(6).join('');

    await cognito
      .adminUpdateUserAttributes({
        UserAttributes: [
          {
            Name: 'custom:authChallenge',
            Value: `${secretLoginCode},${Math.round(
              new Date().valueOf() / 1000
            )}`,
          },
        ],
        UserPoolId: process.env.USER_POOL_ID,
        Username: email,
      })
      .promise();

    await sendEmailViaSes(email, secretLoginCode);

    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('Error signing in', error);
    if (error.code === 'UserNotFoundException') {
      return errorResponse(404, 'User not found');
    }

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

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

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
