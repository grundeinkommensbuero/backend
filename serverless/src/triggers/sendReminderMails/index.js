// const { getAllSignatureLists } = require('../../shared/signatures');
// const { getUser } = require('../../shared/users');
// const sendMail = require('./sendMail');

// const remindAfter = 7;

module.exports.handler = async event => {
  return event;

  /*  try {
    const signatureLists = await getAllSignatureLists();

    // construct a date which is x days ago from now
    const date = new Date();
    date.setDate(date.getDate() - remindAfter);

    // we only want the current day (YYYY-MM-DD), because the lists are saved that way
    const timestamp = date.toISOString().substring(0, 10);

    console.log(`${remindAfter} days ago`, timestamp);

    // Loop through lists to check if a list was created two weeks ago
    for (let list of signatureLists) {
      if (list.campaign.code !== 'hamburg-1') {
        // We only need to check lists of users
        if (list.userId !== 'anonymous') {
          if (list.createdAt === timestamp) {
            console.log('same date', list.createdAt, timestamp, list);

            // List was created x days ago, therefore we might send a reminder mail
            // if the list was not sent yet
            if (!('received' in list)) {
              // Get user from users table to get email
              const result = await getUser(list.userId);

              // the user might have been deleted or does not have
              // newsletter consent
              if (
                'Item' in result &&
                'newsletterConsent' in result.Item &&
                result.Item.newsletterConsent.value
              ) {
                const user = result.Item;

                await sendMail(user, list.campaign);
                console.log('success sending mail to', user.email);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.log('error', error);
  }

  return event;
  */
};
