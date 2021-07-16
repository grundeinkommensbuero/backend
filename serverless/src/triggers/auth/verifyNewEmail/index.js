// This function is triggered when a user wants to change their email.
// A code is sent to their new address to confirm the change.

const htmlMail = require('raw-loader!./verificationMail.html').default;

module.exports.handler = async event => {
  try {
    // Identify why was this function invoked
    if (event.triggerSource === 'CustomMessage_UpdateUserAttribute') {
      const { codeParameter } = event.request;

      // customize email
      event.response.emailSubject =
        'Bitte bestätige deine neue E-Mail-Adresse!';
      event.response.emailMessage = customEmail(codeParameter);
    }

    return event;
  } catch (error) {
    console.log('Error', error);
    return event;
  }
};

const customEmail = code => {
  console.log('html mail', htmlMail);
  return htmlMail.replace(/\[\[CODE\]\]/gi, code);
};
