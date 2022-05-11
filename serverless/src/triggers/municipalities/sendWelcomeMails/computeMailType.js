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
    if (
      lastEmail.key === 'C1.1' &&
      isXDaysAgo(new Date(lastEmail.timestamp), remindAfter) &&
      (!('listFlow' in user) ||
        !('sentList' in user.listFlow) ||
        !user.listFlow.sentList.value)
    ) {
      return 'C2';
    }

    // Only send C1.2 if user has not reacted
    /* Not needed for now
    if (
      lastEmail.key === 'C1.1' &&
      isXDaysAgo(new Date(lastEmail.timestamp), remindAfter) &&
      (!('reacted' in user.welcomeFlow) || !user.welcomeFlow.value)
    ) {
      return 'C1.2';
    }
    */
  }

  return null;
};
