const { updateMailjetSubscription } = require('../../mailjet');
const { getUser } = require('../../../shared/users');

// This function is called post cognito confirmation
// We want to update mailjet accordingly
exports.handler = async event => {
  try {
    // Only run the script if the environment is prod
    if (process.env.STAGE === 'prod') {
      // userName is the user id
      const userId = event.userName;

      // We don't need to update the whole mailjet contact, but only
      // the subsription status, which is why we need the newsletter consent
      const result = await getUser(userId);

      if ('Item' in result) {
        await updateMailjetSubscription(result.Item, true);
      }
    }
  } catch (error) {
    console.log('Error updating mailjet subscription', error);
  }
  return event;
};
