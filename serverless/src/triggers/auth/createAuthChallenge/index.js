const crypto = require('crypto-secure-random-digit');
const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);
const AWS = require('aws-sdk');

const sns = new AWS.SNS();

exports.handler = async event => {
  let secretLoginCode;
  if (!event.request.session || !event.request.session.length) {
    // This is a new auth session
    // Generate a new secret login code and mail it to the user
    secretLoginCode = crypto.randomDigits(6).join('');

    console.log('request', event.request);
    console.log('attributes', event.request.userAttributes);

    // If there is a phone number we want to send to code via sms
    if (event.request.userAttributes.phone_number) {
      await sendSms(event.request.userAttributes.phone_number, secretLoginCode);
    } else {
      await sendEmail(event.request.userAttributes.email, secretLoginCode);
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

// Sends the login code via email through mailjet
const sendEmail = (email, code) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: 1583518,
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

// Sends the login code via sms
const sendSms = (phoneNumber, code) => {
  const params = {
    Message: `Fast geschafft – gib einfach den folgenden Code in das Feld auf unserer Webseite ein und schon bist du eingeloggt: ${code}`,
    PhoneNumber: phoneNumber,
  };

  return sns.publish(params).promise();
};
