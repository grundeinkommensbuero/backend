const { getAllSignatureLists } = require('../../shared/signatures');
const { getUser } = require('../../shared/users');
const sendMail = require('./sendMail');
const remindAfter = 14;

module.exports.handler = async event => {
  try {
    const signatureLists = await getAllSignatureLists();

    // construct a date which is x days ago from now
    const date = new Date();
    date.setDate(date.getDate() - remindAfter);

    // we only want the current day (YYYY-MM-DD), because the lists are saved that way
    const timestamp = date.toISOString().substring(0, 10);

    console.log('two weeks ago', timestamp);

    // Loop through lists to check a list was created two weeks ago
    for (let list of signatureLists) {
      // We only need to check lists of users
      if (list.userId !== 'anonymous') {
        if (list.createdAt === timestamp) {
          console.log('same date', list.createdAt, timestamp);

          // List was created x days ago, therefore we might send a reminder mail
          // if the list was not sent yet
          if (!('received' in list)) {
            // Get user from users table to get email
            const result = await getUser(list.userId);
            const user = result.Item;

            await sendMail(user);
            console.log('success sending mail to', user.email);
          }
        }
      }
    }
  } catch (error) {
    console.log('error', error);
  }

  return event;
};
