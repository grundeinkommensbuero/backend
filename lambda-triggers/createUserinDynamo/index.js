const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async event => {
  // Identify why was this function invoked
  if (event.triggerSource === 'CustomMessage_SignUp') {
    const tableName = process.env.TABLE_NAME;

    //sub is the unique id Cognito assigns to each new user
    const cognitoId = event.request.userAttributes.sub;

    const email = event.request.userAttributes.email;

    const date = new Date();
    const timestamp = date.toISOString();

    //check, if parameters exist
    if (cognitoId && email) {
      //if it is the case proceed in saving the user in the dynamo db

      try {
        await ddb
          .put({
            TableName: tableName,
            Item: {
              cognitoId: cognitoId,
              email: email,
              createdAt: timestamp,
            },
          })
          .promise();

        console.log('Success writing to dynamo');

        //customize email
        const codeParameter = event.request.codeParameter;
        event.response.emailSubject =
          'Bitte bestätige deine E-Mail-Adresse für die Expedition Grundeinkommen!';
        event.response.emailMessage = customEmail(email, codeParameter);
        return event;
      } catch (error) {
        console.log('Error while writing to dynamo', error);
        return event;
      }
    }
    console.log('One or more parameters missing');
    return event;
  } else if (event.triggerSource === 'CustomMessage_ResendCode') {
    const email = event.request.userAttributes.email;
    //customize email
    const codeParameter = event.request.codeParameter;
    event.response.emailSubject =
      'Volksabstimmung Grundeinkommensexperiment: Bitte bestätige deine E-Mail-Adresse!';
    event.response.emailMessage = customReminderEmail(email, codeParameter);
    console.log('Sending verification reminder');
    return event;
  }
};

const customEmail = (email, codeParameter) => {
  return `<p>Hallo,</p> 
          <p>
          fast geschafft – sch&#246;n, dass du dabei bist! Ein letzter Schritt, und dann bist du an Bord. 
          Bitte best&#228;tige noch deine E-Mail-Adresse:
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

const customReminderEmail = (email, codeParameter) => {
  return `<p>Hallo,</p> 
          <p>
          du hast deine E-Mail-Adresse f&#252;r die Volksabstimmung zum Grundeinkommen in Schleswig-Holstein noch nicht best&#228;tigt. 
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
