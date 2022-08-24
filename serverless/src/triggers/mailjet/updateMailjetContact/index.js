const { deleteMailjetContact, syncMailjetContact } = require('../');
const { trustCirclesUser, enableShop } = require('../../../shared/circles');
const {
  getMunicipalitiesOfUserWithData,
} = require('../../../shared/municipalities');
const { getSignatureListsOfUser } = require('../../../shared/signatures');
const { getUser } = require('../../../shared/users');

const CIRCLES_MINIMUM = 20;

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

          // If email was changed we need to delete the old mailjet record
          if (
            cameFromUsersTable &&
            record.dynamodb.OldImage.email.S !==
              record.dynamodb.NewImage.email.S
          ) {
            await deleteMailjetContact(record.dynamodb.OldImage.email.S);
          }

          // We want to get the normal dynamo record to not have to deal
          // with the weird data format of the stream
          const result = await getUser(userId);
          console.log('result', result);

          if ('Item' in result) {
            const user = result.Item;
            // Get signature lists of this user and add it to user object
            const signatureListsResult = await getSignatureListsOfUser(
              user.cognitoId
            );

            // Sort lists by date (earliest first)
            user.signatureLists = signatureListsResult.Items.sort(
              (a, b) => a.createdAt - b.createdAt
            );

            // Get municipalities of user
            user.municipalities = await getMunicipalitiesOfUserWithData(
              user.cognitoId
            );

            const verified = 'confirmed' in user && user.confirmed.value;

            await syncMailjetContact(user, verified);

            const signatureCount = countSignatures(user.signatureLists);

            if (
              signatureCount >= CIRCLES_MINIMUM &&
              'store' in user &&
              'circlesResumee' in user.store &&
              'safeAddress' in user.store.circlesResumee
            ) {
              await trustCirclesUser(user.store.circlesResumee.safeAddress);
              await enableShop(user);
            }
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

const countSignatures = signatureLists => {
  let signatureCount = 0;

  for (const list of signatureLists) {
    if ('received' in list) {
      for (const scan of list.received) {
        signatureCount += scan.count;
      }
    }
  }

  return signatureCount;
};
