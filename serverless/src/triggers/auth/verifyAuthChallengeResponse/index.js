const { sendEmail } = require('../createAuthChallenge');

exports.handler = async event => {
  const expectedAnswer =
    event.request.privateChallengeParameters.secretLoginCode;
  if (event.request.challengeAnswer === expectedAnswer) {
    event.response.answerCorrect = true;
  } else if (event.request.challengeAnswer === 'resendCode') {
    await sendEmail(event.request.userAttributes, expectedAnswer);
    event.response.answerCorrect = false;
  } else {
    event.response.answerCorrect = false;
  }
  return event;
};
