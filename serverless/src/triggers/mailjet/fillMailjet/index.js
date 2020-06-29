const AWS = require('aws-sdk');
const { getSignatureListsOfUser } = require('../../../shared/signatures');
const {
  getAllUnverifiedCognitoUsers,
  isVerified,
} = require('../../../shared/users');
const { syncMailjetContact } = require('../');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const lambda = new AWS.Lambda();

const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async (event, context) => {
  // Only run the script if the environment is prod
  if (process.env.STAGE === 'prod') {
    await fillMailjet(event, context);
  }

  return event;
};

// Loops through all users to update the corrsesponding mailjet contact
const fillMailjet = async (event, context) => {
  try {
    // If the lambda was invoked recursively we got the startKey as payload
    const startKey = event.startKey || null;
    console.log('startkey of new lambda', startKey);

    const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();

    await processBatchOfUsers(event, context, unverifiedCognitoUsers, startKey);
  } catch (error) {
    console.log('error', error);
  }
};

const getBatchOfUsers = (startKey = null) => {
  const params = {
    TableName: tableName,
    Limit: 500,
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  return ddb.scan(params).promise();
};

const processBatchOfUsers = async (
  event,
  context,
  unverifiedCognitoUsers,
  startKey
) => {
  console.log('processing another batch with startKey', startKey);

  const result = await getBatchOfUsers(startKey);

  if (result.Count > 0) {
    const users = result.Items;

    let count = 0;
    for (const user of users) {
      // check if the user is verified
      const verified = isVerified(user, unverifiedCognitoUsers);

      // Get signature lists of this user and add it to user object
      const signatureListsResult = await getSignatureListsOfUser(
        user.cognitoId
      );

      user.signatureLists = signatureListsResult.Items;

      if (user.email) {
        await syncMailjetContact(user, verified);
      }

      count++;
    }

    console.log('updated count', count);

    // After batch of users is processed check how much time we have got left in this lambda
    // and if there are still users to process
    if ('LastEvaluatedKey' in result) {
      // If the remaining time is more than x minutes start a new batch
      if (context.getRemainingTimeInMillis() > 400000) {
        await processBatchOfUsers(
          event,
          context,
          unverifiedCognitoUsers,
          result.LastEvaluatedKey
        );
      } else {
        // Start new lambda function
        // First of all create a new event object with the start key
        const newEvent = Object.assign(event, {
          startKey: result.LastEvaluatedKey,
        });

        const req = {
          FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
          InvocationType: 'Event',
          Payload: JSON.stringify(newEvent),
        };

        await lambda.invoke(req).promise();
        console.log(
          'invoked new lambda with startKey',
          result.LastEvaluatedKey
        );
      }
    }

    return;
  }
};
