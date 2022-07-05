const { sendErrorMail } = require('../../shared/errorHandling');
const { getUsersForListsToWork } = require('../../shared/users');
const { isXDaysAgo, isToday } = require('../../shared/utils');
const sendMail = require('./sendMail');

const secondMailAfter = 7;
const thirdMailAfter = 14;

const ONE_DAY = 24 * 60 * 60 * 1000;

module.exports.handler = async event => {
  try {
    const users = await getUsersForListsToWork();

    for (const user of users) {
      if (
        user.store.listsToWork.value &&
        'reminderMails' in user &&
        user.reminderMails.value
      ) {
        const timestamp = user.store.listsToWork.timestamp;
        const now = new Date();

        // We want to send the first mail on the same day,
        // therefore we check the last 24 hours
        if (now - new Date(timestamp) < ONE_DAY) {
          await sendMail(user, 1);
          console.log('sent mail 1', user.email);
        } else if (isXDaysAgo(new Date(timestamp), secondMailAfter)) {
          await sendMail(user, 2);
          console.log('sent mail 2', user.email);
        } else if (isXDaysAgo(new Date(timestamp), thirdMailAfter)) {
          console.log(await sendMail(user, 3));
          console.log('sent mail 3', user.email);
        } else if (isToday(new Date('2022-07-24'))) {
          await sendMail(user, 4);
          console.log('sent mail 4', user.email);
        } else if (isToday(new Date('2022-08-02'))) {
          await sendMail(user, 5);
          console.log('sent mail 5', user.email);
        }
      }
    }
  } catch (error) {
    console.log('error', error);
    await sendErrorMail('send lists to work', error);
  }

  return event;
};
