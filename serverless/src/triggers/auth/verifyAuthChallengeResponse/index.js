const { sendEmailViaSes } = require('../createAuthChallenge');

exports.handler = async event => {
  const expectedAnswer =
    event.request.privateChallengeParameters.secretLoginCode;
  if (event.request.challengeAnswer === expectedAnswer) {
    event.response.answerCorrect = true;
  } else if (event.request.challengeAnswer === 'resendCode') {
    // We want to send the second mail via SES as a fallback
    await sendEmailViaSes(event.request.userAttributes.email, expectedAnswer);
    event.response.answerCorrect = false;
  } else {
    event.response.answerCorrect = false;
  }
  return event;
};
