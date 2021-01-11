// eslint-disable-next-line
// const htmlMailDefault = require('raw-loader!./mailTemplate.html').default;
// eslint-disable-next-line
// const htmlMailBBPlatform = require('raw-loader!./mailBBPlatform.html').default;

// this lambda not only sends the verification mail
// but also creates a record for the user in dynamo
module.exports.handler = async event => {
  // Deactivate for now because of switch to passwordless auth
  return event;

  // Identify why was this function invoked
  // eslint-disable-next-line
  if (event.triggerSource === 'CustomMessage_SignUp') {
    // We need to retrieve the source attribute to be able to send a different mail
    // for the bb platform
    const { email, 'custom:source': source } = event.request.userAttributes;
    const { codeParameter } = event.request;

    // customize email
    event.response.emailSubject =
      source === 'bb-platform'
        ? 'Bitte bestätige deine E-Mail-Adresse für die Demokratie in Brandenburg!'
        : 'Bitte bestätige deine E-Mail-Adresse für die Expedition Grundeinkommen!';
    event.response.emailMessage = customEmail(email, codeParameter, source);

    return event;
  } else if (event.triggerSource === 'CustomMessage_ResendCode') {
    const { email } = event.request.userAttributes;
    const { codeParameter } = event.request;

    // customize email
    event.response.emailSubject =
      'Volksabstimmung Grundeinkommensexperiment: Bitte bestätige deine E-Mail-Adresse!';
    event.response.emailMessage = customReminderEmail(email, codeParameter);
    console.log('Sending verification reminder');

    return event;
  }

  console.log('neither of the defined events');
  return event;
};

const customEmail = (email, codeParameter, source) => {
  const link =
    source === 'bb-platform'
      ? `https://brandenburg-mitbestimmen.de/verifizierung/?email=${email}&code=${codeParameter}`
      : `https://expedition-grundeinkommen.de/verifizierung/?email=${email}&code=${codeParameter}`;

  // If source is dibb we want to send a different mail (for the bb platform)
  const htmlMail =
    source === 'bb-platform' ? htmlMailBBPlatform : htmlMailDefault;

  return htmlMail.replace(/\[\[VERIFICATION_LINK\]\]/gi, link);
};

const customReminderEmail = (email, codeParameter) => {
  return `<p>Hallo,</p>
          <p>
          du hast deine E-Mail-Adresse f&#252;r die Expedition Grundeinkommen noch nicht best&#228;tigt.
          Das ist besonders wichtig, da wir deine Daten ohne diese Best&#228;tigung leider wieder l&#246;schen m&#252;ssen.
          Nur noch ein Klick auf diesen Link und du bist wirklich dabei:
          </p>
          <p>
              <a href="https://expedition-grundeinkommen.de/verifizierung/?email=${email}&code=${codeParameter}">
                 https://expedition-grundeinkommen.de/verifizierung/?email=${email}&code=${codeParameter}
              </a>
          </p>
          <br>
          <p>
          Danke!
          </p>
          Dein Support-Team von<br>
          Expedition Grundeinkommen
          <br>
          <br>
          <br>
          <br>
          --------------------------------------------
          <br>
          <p>
            <a href="www.expedition-grundeinkommen.de">
              www.expedition-grundeinkommen.de
            </a>
            <br>
            <a href="mailto:support@expedition-grundeinkommen.de">
              support@expedition-grundeinkommen.de
            </a>
          </p>
  `;
};
