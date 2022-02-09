// Numbers define days after last email or after attribute was set
const b2RemindAfter = [3, 7];
const b346RemindAfter = [3, 1, 3, 3];
const stepToEmailMap = {
  downloadedList: 'B2',
  printedList: 'B3',
  signedList: 'B4',
  sentList: 'B6',
};

// Based on user and list data this function computes
// which mail should be sent next
module.exports.computeMailType = (user, list) => {
  // Mailtypes will correspond to user flows
  let mailType = null;

  // Get last email from array of history of sent emails
  const lastEmail =
    'listFlow' in user &&
    'emailsSent' in user.listFlow &&
    user.listFlow.emailsSent.length > 0
      ? user.listFlow.emailsSent[user.listFlow.emailsSent.length - 1]
      : null;

  if (
    (!('listFlow' in user) ||
      !('downloadedList' in user.listFlow) ||
      !user.listFlow.downloadedList.value) &&
    // We also need to check if there are already other attributes set
    !laterAttributesAreSet(user.listFlow, 'downloadedList')
  ) {
    mailType = computeFirstStep(list.createdAt, lastEmail);
  } else if (
    'listFlow' in user &&
    (!('printedList' in user.listFlow) || !user.listFlow.printedList.value) &&
    // We also need to check if there are already other attributes set
    !laterAttributesAreSet(user.listFlow, 'printedList')
  ) {
    mailType = computeNextStep(
      user,
      list.createdAt,
      lastEmail,
      'downloadedList',
      'printedList'
    );
  } else if (
    'listFlow' in user &&
    (!('signedList' in user.listFlow) || !user.listFlow.signedList.value) &&
    // We also need to check if there are already other attributes set
    !laterAttributesAreSet(user.listFlow, 'signedList')
  ) {
    mailType = computeNextStep(
      user,
      list.createdAt,
      lastEmail,
      'printedList',
      'signedList'
    );
  } else if (
    'listFlow' in user &&
    (!('sentList' in user.listFlow) || !user.listFlow.sentList.value)
  ) {
    mailType = computeNextStep(
      user,
      list.createdAt,
      lastEmail,
      'signedList',
      'sentList'
    );
  }

  return mailType;
};

const computeFirstStep = (listCreatedAt, lastEmail) => {
  let date;

  // Depending on whether B2 was already sent,
  // we check if either B2 or B1 (list creation) was x
  // days ago
  if (lastEmail && lastEmail.key === 'B2.1') {
    date = new Date(lastEmail.timestamp);
    date.setDate(date.getDate() + b2RemindAfter[1]);

    if (isToday(date)) {
      return 'B2.2';
    }
  } else {
    date = new Date(listCreatedAt);

    date.setDate(date.getDate() + b2RemindAfter[0]);

    if (isToday(date)) {
      return 'B2.1';
    }
  }

  return null;
};

const computeNextStep = (
  user,
  listCreatedAt,
  lastEmail,
  lastStep,
  currentStep
) => {
  if (lastEmail && lastEmail.key.startsWith(stepToEmailMap[lastStep])) {
    // In this case we don't want to check when the last email was sent
    // but when the last attribute was set
    const dateOfAttribute = new Date(user.listFlow[lastStep].timestamp);
    // Add days to createdAt and check if it is today
    dateOfAttribute.setDate(dateOfAttribute.getDate() + b346RemindAfter[1]);

    if (isToday(dateOfAttribute)) {
      return `${stepToEmailMap[currentStep]}.1`;
    }
  } else if (
    lastEmail &&
    lastEmail.key.startsWith(stepToEmailMap[currentStep])
  ) {
    const date = new Date(lastEmail.timestamp);

    // If last email was the first of this step (e.g. B3.1), then send next one (B3.2)
    if (lastEmail.key.endsWith('.1')) {
      // Add days to createdAt and check if it is today
      date.setDate(date.getDate() + b346RemindAfter[2]);
      if (isToday(date)) {
        return lastEmail.key.replace('.1', '.2');
      }
    } else {
      date.setDate(date.getDate() + b346RemindAfter[3]);

      // The last iteration of this step we only want to send
      // if user wanted to be reminded
      if (
        isToday(date) &&
        currentStep in user.listFlow &&
        user.listFlow[currentStep].remind
      ) {
        return lastEmail.key.replace('.2', '.3');
      }
    }
  } else {
    // This is the case were no email except for B1 (list creation was sent).
    // If the user only received B1, but has already said that they have achieved the last step
    // we skip mail to send next one instead instead.
    // For example, user has already downloaded list, then we skip B2 and send B3.
    // In the code, it is basically the same though, the timespan between mails is just different.
    // Add days to createdAt and check if it is today
    const date = new Date(listCreatedAt);
    date.setDate(date.getDate() + b346RemindAfter[0]);

    if (isToday(date)) {
      return `${stepToEmailMap[currentStep]}.1`;
    }
  }

  return null;
};

const isToday = date => {
  return (
    date.toISOString().substring(0, 10) ===
    new Date().toISOString().substring(0, 10)
  );
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
