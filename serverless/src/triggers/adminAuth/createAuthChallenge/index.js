const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const crypto = require('crypto-secure-random-digit');
const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);
const { getUser } = require('../../../shared/users');
const { sleep } = require('../../../shared/utils');

const ses = new AWS.SES();
const THREE_MINUTES = 3 * 60 * 1000;
// eslint-disable-next-line
const fallBackMail = require('raw-loader!./loginCodeMail.html').default;

const handler = async event => {
  let secretLoginCode;
  if (!event.request.session || !event.request.session.length) {
    // This is a new auth session

    // Get user to check if a token was added recently (sub is userId)
    const result = await getUser(event.request.userAttributes.sub);

    // Only set the token as loginCode if it is not older than 3 minutes
    if (
      'Item' in result &&
      'customToken' in result.Item &&
      new Date() - new Date(result.Item.customToken.timestamp) < THREE_MINUTES
    ) {
      secretLoginCode = result.Item.customToken.token;
    } else {
      // Generate a new secret login code and mail it to the user
      secretLoginCode = crypto.randomDigits(6).join('');

      let retry = true;

      // We want to catch the 429 rate limit error and try again after x seconds
      while (retry) {
        try {
          retry = false;
          await sendEmail(event.request.userAttributes, secretLoginCode);
        } catch (error) {
          if (error.statusCode === 429) {
            console.log(error);

            retry = true;
            await sleep(2000);
          }
        }
      }
    }
  } else {
    // There's an existing session. Don't generate new digits but
    // re-use the code from the current session. This allows the user to
    // make a mistake when keying in the code and to then retry, rather
    // the needing to e-mail the user an all new code again.
    const previousChallenge = event.request.session.slice(-1)[0];
    secretLoginCode = previousChallenge.challengeMetadata.match(
      /CODE-(\d*)/
    )[1];
  }
  // This is sent back to the client app
  event.response.publicChallengeParameters = {
    email: event.request.userAttributes.email,
  };
  // Add the secret login code to the private challenge parameters
  // so it can be verified by the "Verify Auth Challenge Response" trigger
  event.response.privateChallengeParameters = { secretLoginCode };
  // Add the secret login code to the session so it is available
  // in a next invocation of the "Create Auth Challenge" trigger
  event.response.challengeMetadata = `CODE-${secretLoginCode}`;
  return event;
};

const sendEmail = (userAttributes, code) => {
  // If user was created via BB plattform we want to send a different mail
  const signedUpOnBBPlatform =
    userAttributes['custom:source'] === 'bb-platform';

  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: userAttributes.email,
          },
        ],
        TemplateID: signedUpOnBBPlatform ? 1945264 : 1583518,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          code,
        },
      },
    ],
  });
};

const sendEmailViaSes = (email, code) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <newsletter@expedition-grundeinkommen.de>',
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
  if (!fallBackMail) {
    throw new Error('Html Mail not provided');
  }

  return fallBackMail
    .replace(/\[\[CODE\]\]/gi, code)
    .replace(/\[\[EMAIL_TO\]\]/gi, email);
};

module.exports = { sendEmail, handler, sendEmailViaSes };
