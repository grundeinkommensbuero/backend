const { deleteMailjetContact, syncMailjetContact } = require('../');
const { getSignatureListsOfUser } = require('../../../shared/signatures');
const { getUser, getCognitoUser } = require('../../../shared/users');

module.exports.handler = async event => {
  try {
    // Only run the script if the environment is prod
    if (process.env.STAGE === 'prod') {
      for (const record of event.Records) {
        console.log({ record });

        // Check whether the stream came from users or signatures table
        // (depending on the key)
        let cameFromUsersTable = false;
        let userId;
        if ('cognitoId' in record.dynamodb.Keys) {
          cameFromUsersTable = true;
          userId = record.dynamodb.Keys.cognitoId.S;
        } else if (record.eventName !== 'REMOVE') {
          // came from signatures table stream
          userId = record.dynamodb.NewImage.userId.S;
        }

        if (record.eventName === 'REMOVE') {
          // record was removed
          // which is why we want to remove the mailjet contact as well

          if (cameFromUsersTable) {
            console.log('record was removed', record);
            try {
              const email = record.dynamodb.OldImage.email.S;

              await deleteMailjetContact(email);
              console.log('success deleting contact');
            } catch (error) {
              console.log('error deleting contact', error);
            }
          }
        } else if (userId !== 'anonymous') {
          // Record was updated
          console.log('about to update user', userId);
          console.log('came from users table', cameFromUsersTable);

          // We want to get the normal dynamo record to not have to deal
          // with the weird data format of the stream
          const result = await getUser(userId);

          if ('Item' in result) {
            const user = result.Item;
            // Get signature lists of this user and add it to user object
            const signatureListsResult = await getSignatureListsOfUser(
              user.cognitoId
            );

            user.signatureLists = signatureListsResult.Items;

            // We also need to get the cognito user to check if the user is verified
            const { UserStatus } = await getCognitoUser(userId);
            const verified = UserStatus === 'CONFIRMED';

            await syncMailjetContact(user, verified);
          }
        }
      }
      return `Successfully processed ${event.Records.length} records.`;
    }
  } catch (error) {
    console.log('error while updating mailjet', error);
  }

  return event;
};
