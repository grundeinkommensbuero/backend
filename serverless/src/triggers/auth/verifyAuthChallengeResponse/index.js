const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const LINK_TIMEOUT_SECONDS = 20 * 60; // number of seconds the magic link should be valid

exports.handler = async event => {
  // Get challenge and timestamp from user attributes
  const [authChallenge, timestamp] = (
    event.request.privateChallengeParameters.challenge || ''
  ).split(',');

  // Check if code is equal to what we expect and whether the link hasn't timed out...
  if (
    event.request.challengeAnswer === authChallenge &&
    Number(timestamp) > new Date().valueOf() / 1000 - LINK_TIMEOUT_SECONDS
  ) {
    event.response.answerCorrect = true;
  } else if (event.request.challengeAnswer === 'resendCode') {
    // We want to send the second mail via Mailjet as a fallback
    await sendEmail(event.request.userAttributes.email, authChallenge);
    event.response.answerCorrect = false;
  } else {
    event.response.answerCorrect = false;
  }

  return event;
};

const sendEmail = (userAttributes, code) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: userAttributes.email,
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
