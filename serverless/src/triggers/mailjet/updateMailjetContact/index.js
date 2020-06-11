const AWS = require('aws-sdk');
const { deleteMailjetContact, syncMailjetContact } = require('../');
const { getSignatureListsOfUser } = require('../../../shared/signatures');
const { getUser, getCognitoUser } = require('../../../shared/users');

module.exports.handler = async event => {
  try {
    // Only run the script if the environment is prod
    if (process.env.STAGE === 'prod' || true) {
      for (let record of event.Records) {
        console.log({ record });
        const userId = record.dynamodb.Keys.cognitoId.S;

        if (record.eventName === 'REMOVE') {
          //record was removed
          //which is why we want to remove the mailjet contact as well

          console.log('record was removed', record);
          try {
            const email = record.dynamodb.OldImage.email.S;

            await deleteMailjetContact(email);
            console.log('success deleting contact');
          } catch (error) {
            console.log('error deleting contact', error);
          }
        } else {
          // Record was updated
          // We want to get the normal dynamo record to not have to deal
          // with the weird data format of the stream
          // Get signature lists of this user and add it to user object
          const result = await getUser(userId);

          if ('Item' in result) {
            const user = result.Item;
            user.signatureLists = await getSignatureListsOfUser(user.cognitoId);

            // We also need to get the cognito user to check if the user is verified
            const { UserStatus } = await getCognitoUser(user.cognitoId);
            const verified = UserStatus === 'CONFIRMED';

            await syncMailjetContact(user, verified);
          }
        }
      }
      return `Successfully processed ${event.Records.length} records.`;
    }
  } catch (error) {
    console.log('error while updating pinpoint', error);
  }

  return;
};
