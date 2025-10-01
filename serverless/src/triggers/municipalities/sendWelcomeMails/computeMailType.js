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

  // Not needed for now, only one mail
  // if (lastEmail) {
  //   if (
  //     lastEmail.key === 'C1.1' &&
  //     isXDaysAgo(new Date(lastEmail.timestamp), remindAfter) &&
  //     (!('listFlow' in user) ||
  //       !('sentList' in user.listFlow) ||
  //       !user.listFlow.sentList.value)
  //   ) {
  //     return 'C2';
  //   }

  //   // Only send C1.2 if user has not reacted
  //   /* Not needed for now
  //   if (
  //     lastEmail.key === 'C1.1' &&
  //     isXDaysAgo(new Date(lastEmail.timestamp), remindAfter) &&
  //     (!('reacted' in user.welcomeFlow) || !user.welcomeFlow.value)
  //   ) {
  //     return 'C1.2';
  //   }
  //   */
  // }

  return null;
};

const WELCOME_DELAYS_DAYS = {
  welcome1: 0, // send within 1 day of signup
  welcome2: 3, // days after welcome1
  welcome3: 3, // days after welcome2
};

module.exports.computeMailTypeHamburg = (user, municipalitySignupCreatedAt) => {
  const emailsSent = user.welcomeFlow?.emailsSent?.map(e => e.key) || [];
  const lastEmail =
    user.welcomeFlow?.emailsSent?.[user.welcomeFlow.emailsSent.length - 1] ||
    null;

  if (!emailsSent.includes('welcome1')) {
    const createdAt = new Date(municipalitySignupCreatedAt);
    if (
      isXDaysAgo(createdAt, WELCOME_DELAYS_DAYS.welcome1) ||
      new Date() - createdAt < 24 * 60 * 60 * 1000
    ) {
      return 'welcome1';
    }
  }

  if (emailsSent.includes('welcome1') && !emailsSent.includes('welcome2')) {
    if (
      isXDaysAgo(new Date(lastEmail.timestamp), WELCOME_DELAYS_DAYS.welcome2)
    ) {
      return 'welcome2';
    }
  }

  if (emailsSent.includes('welcome2') && !emailsSent.includes('welcome3')) {
    if (
      isXDaysAgo(new Date(lastEmail.timestamp), WELCOME_DELAYS_DAYS.welcome3)
    ) {
      return 'welcome3';
    }
  }

  return null;
};
