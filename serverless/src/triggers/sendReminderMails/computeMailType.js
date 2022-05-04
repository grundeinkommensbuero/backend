const { isXDaysAgo } = require('../../shared/utils');

// Numbers define days after last email or after attribute was set
const b2RemindAfter = [3, 7];
const b346RemindAfter = [3, 1, 3, 3];
const stepToEmailMap = {
  downloadedList: 'B2',
  printedList: 'B3',
  signedList: 'B4',
  sentList: 'B6',
};

// Is always the same for every mail in A flow
const aRemindAfter = 14;
const aRemindAfterShort = 7;

const ONE_DAY = 24 * 60 * 60 * 1000;

// Based on user and list data this function computes
// which mail should be sent next
module.exports.computeMailType = (user, list) => {
  // Mailtypes will correspond to user flows
  // There might be multiple mail types, if flows (A and B) overlap, therefore we use an array
  const mailTypes = [];

  // Get last email from array of history of sent emails
  const lastListEmail =
    'listFlow' in user &&
    'emailsSent' in user.listFlow &&
    user.listFlow.emailsSent.length > 0
      ? user.listFlow.emailsSent[user.listFlow.emailsSent.length - 1]
      : null;

  // Get last email from array of history of sent emails
  const lastCtaEmail =
    'ctaFlow' in user &&
    'emailsSent' in user.ctaFlow &&
    user.ctaFlow.emailsSent.length > 0
      ? user.ctaFlow.emailsSent[user.ctaFlow.emailsSent.length - 1]
      : null;

  // A Flow

  // If list was created within the last 24 hours we send the first mail
  // In comparison to the B flow, where we check if something happened x days ago,
  // we now check if it happened during last day, because ideally we send the email the same day
  // We also need to check if the user has signed up during this period or if it is an old user

  const now = new Date();
  if (
    now - new Date(list.createdAt) < ONE_DAY &&
    now - new Date(user.createdAt) < ONE_DAY &&
    list.campaign.code === 'berlin-2'
  ) {
    mailTypes.push('A1');
  }
  // If user has clicked cta in first email (shared = true) or has signed the list
  // (if user has "scanned a list" that attribute is set automatically)
  else if (
    lastCtaEmail &&
    isXDaysAgo(new Date(lastCtaEmail.timestamp), aRemindAfter) &&
    lastCtaEmail.key === 'A1'
  ) {
    mailTypes.push('A2');
  }
  // If user has clicked CTA in A2 we send the next mail after a week
  else if (
    lastCtaEmail &&
    isXDaysAgo(new Date(lastCtaEmail.timestamp), aRemindAfterShort) &&
    lastCtaEmail.key === 'A2'
  ) {
    mailTypes.push('A3');
  }
  // Not depending on a cta we send A4 x days after A3
  else if (
    lastCtaEmail &&
    lastCtaEmail.key === 'A3' &&
    isXDaysAgo(new Date(lastCtaEmail.timestamp), aRemindAfterShort)
  ) {
    mailTypes.push('A4');
  }

  // B Flow

  if (
    (!('listFlow' in user) ||
      !('downloadedList' in user.listFlow) ||
      !user.listFlow.downloadedList.value) &&
    // We also need to check if there are already other attributes set
    !laterAttributesAreSet(user.listFlow, 'downloadedList')
  ) {
    const step = computeFirstStep(list.createdAt, lastListEmail);

    if (step) {
      mailTypes.push(step);
    }
  } else if (
    'listFlow' in user &&
    (!('printedList' in user.listFlow) || !user.listFlow.printedList.value) &&
    // We also need to check if there are already other attributes set
    !laterAttributesAreSet(user.listFlow, 'printedList')
  ) {
    const nextStep = computeNextStep(
      user,
      list.createdAt,
      lastListEmail,
      'downloadedList',
      'printedList'
    );

    if (nextStep) {
      mailTypes.push(nextStep);
    }
  } else if (
    'listFlow' in user &&
    (!('signedList' in user.listFlow) || !user.listFlow.signedList.value) &&
    // We also need to check if there are already other attributes set
    !laterAttributesAreSet(user.listFlow, 'signedList')
  ) {
    const nextStep = computeNextStep(
      user,
      list.createdAt,
      lastListEmail,
      'printedList',
      'signedList'
    );

    if (nextStep) {
      mailTypes.push(nextStep);
    }
  } else if (
    'listFlow' in user &&
    (!('sentList' in user.listFlow) || !user.listFlow.sentList.value)
  ) {
    const nextStep = computeNextStep(
      user,
      list.createdAt,
      lastListEmail,
      'signedList',
      'sentList'
    );

    if (nextStep) {
      mailTypes.push(nextStep);
    }
  }

  return mailTypes;
};

const computeFirstStep = (listCreatedAt, lastListEmail) => {
  // Depending on whether B2 was already sent,
  // we check if either B2 or B1 (list creation) was x
  // days ago
  if (lastListEmail && lastListEmail.key === 'B2.1') {
    if (isXDaysAgo(new Date(lastListEmail.timestamp), b2RemindAfter[1])) {
      return 'B2.2';
    }
  } else if (isXDaysAgo(new Date(listCreatedAt), b2RemindAfter[0])) {
    return 'B2.1';
  }

  return null;
};

const computeNextStep = (
  user,
  listCreatedAt,
  lastListEmail,
  lastStep,
  currentStep
) => {
  if (lastListEmail && lastListEmail.key.startsWith(stepToEmailMap[lastStep])) {
    // In this case we don't want to check when the last email was sent
    // but when the last attribute was set
    const dateOfAttribute = new Date(user.listFlow[lastStep].timestamp);

    if (isXDaysAgo(dateOfAttribute, b346RemindAfter[1])) {
      return `${stepToEmailMap[currentStep]}.1`;
    }
  } else if (
    lastListEmail &&
    lastListEmail.key.startsWith(stepToEmailMap[currentStep])
  ) {
    const date = new Date(lastListEmail.timestamp);

    // If last email was the first of this step (e.g. B3.1), then send next one (B3.2)
    if (
      lastListEmail.key.endsWith('.1') &&
      isXDaysAgo(date, b346RemindAfter[2])
    ) {
      return lastListEmail.key.replace('.1', '.2');
    } else if (
      isXDaysAgo(date, b346RemindAfter[3]) &&
      currentStep in user.listFlow &&
      user.listFlow[currentStep].remind
    ) {
      // The last iteration of this step we only want to send
      // if user wanted to be reminded

      return lastListEmail.key.replace('.2', '.3');
    }
  } else if (isXDaysAgo(new Date(listCreatedAt), b346RemindAfter[0])) {
    // This is the case were no email except for B1 (list creation was sent).
    // If the user only received B1, but has already said that they have achieved the last step
    // we skip mail to send next one instead instead.
    // For example, user has already downloaded list, then we skip B2 and send B3.
    // In the code, it is basically the same though, the timespan between mails is just different.
    // Add days to createdAt and check if it is today

    return `${stepToEmailMap[currentStep]}.1`;
  }

  return null;
};

// The param attribute is the one, which is "allowed" to be set
const laterAttributesAreSet = (listFlow, attribute) => {
  if (typeof listFlow === 'undefined') {
    return false;
  }

  // Use variables to make it more DRY
  const printedCondition =
    'printedList' in listFlow && listFlow.printedList.value;
  const signedCondition = 'signedList' in listFlow && listFlow.signedList.value;
  const sentCondition = 'sentList' in listFlow && listFlow.sentList.value;

  if (attribute === 'downloadedList') {
    return printedCondition || signedCondition || sentCondition;
  }

  if (attribute === 'printedList') {
    return signedCondition || sentCondition;
  }

  if (attribute === 'signedList') {
    return sentCondition;
  }

  return false;
};
