const { isXDaysAgo } = require('../../../shared/utils');

const remindAfter = 7;

module.exports.computeMailType = (user, municipalitySignupCreatedAt) => {
  // Get last email from array of history of sent emails
  const lastEmail =
    'welcomeFlow' in user &&
    'emailsSent' in user.welcomeFlow &&
    user.welcomeFlow.emailsSent.length > 0
      ? user.welcomeFlow.emailsSent[user.welcomeFlow.emailsSent.length - 1]
      : null;

  // If today is x days after user signed up for municipality
  // or x days after the first mail was sent, we send the email
  // or x days after the second mail, but only if user wants to be reminded
  if (isXDaysAgo(new Date(municipalitySignupCreatedAt), remindAfter)) {
    return 'C1.1';
  }

  if (lastEmail) {
    // If user has reacted in any way to mail C1, we don't send another C1
    // and only send C2, if user wanted to be reminded
    if (
      'reacted' in user.welcomeFlow &&
      user.welcomeFlow.reacted.value &&
      'remind' in user.welcomeFlow &&
      user.welcomeFlow.remind.value &&
      isXDaysAgo(new Date(user.welcomeFlow.remind.timestamp), remindAfter)
    ) {
      return 'C2';
    }

    // Only send C1.2 if user has not reacted
    if (
      lastEmail.key === 'C1.1' &&
      isXDaysAgo(new Date(lastEmail.timestamp), remindAfter) &&
      (!('reacted' in user.welcomeFlow) || !user.welcomeFlow.value)
    ) {
      return 'C1.2';
    }
  }

  return null;
};
