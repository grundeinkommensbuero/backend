const { getUsersForListsToWork } = require('../../shared/users');
const { isXDaysAgo } = require('../../shared/utils');
const sendMail = require('../sendCongratulationMails/sendMail');

const firstMailAfter = 1;
const secondMailAfter = 5;
const thirdMailAfter = 10;

module.exports.handler = async event => {
  try {
    const users = await getUsersForListsToWork();

    for (const user of users) {
      if (user.store.listsToWork.value) {
        const signupDate = new Date(user.store.listsToWork.timestamp);
        if (isXDaysAgo(signupDate, firstMailAfter)) {
          await sendMail(user, 1);
        } else if (isXDaysAgo(signupDate, secondMailAfter)) {
          await sendMail(user, 2);
        } else if (isXDaysAgo(signupDate, thirdMailAfter)) {
          await sendMail(user, 3);
        }
      }
    }
  } catch (error) {
    console.log('error', error);
  }

  return event;
};
