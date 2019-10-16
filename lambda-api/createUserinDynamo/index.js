const AWS = require("aws-sdk");

const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = async event => {
  // Identify why was this function invoked
  if (event.triggerSource === "CustomMessage_SignUp") {
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
              pledge: {}
            }
          })
          .promise();

        console.log("Success writing to dynamo");

        //customize email
        const codeParameter = event.request.codeParameter;
        console.log("event response before", event.response);
        event.response.emailSubject = "Dein Bestätigungslink";
        event.response.emailMessage = customEmail(email, codeParameter);
        console.log("event response after", event.response);
        return event;
      } catch (error) {
        console.log("Error while writing to dynamo", error);
        return event;
      }
    }
    console.log("One or more parameters missing");
    return event;
  }
};

const customEmail = (email, codeParameter) => {
  return `<p>Drück den Button<p>
      <a href="https://dev.xbge.de/verification/?email=${email}&code=${codeParameter}">
        <button>Verifizierung<button>
      </a>
  `;
};
