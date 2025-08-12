/**
 * This function is a scheduled job which runs through the db and check which users
 * were referred by user A. The ids of those users will be saved in user A
 */



const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { getReferredUsers, getUser } = require('../../shared/users');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));
const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  const users = await getReferredUsers();

  for (const user of users) {
    const result = await getUser(user.store.referredByUser);

    if ('Item' in result) {
      await updateUser(result.Item, user.cognitoId);

      console.log('updated user', result.Item.cognitoId);
    } else {
      console.log('User does not exist anymore', user.store.referredByUser);
    }
  }

  return event;
};

// Add the referred user to an array of the user who referred them
const updateUser = ({ cognitoId, referredUsers }, referredUserId) => {
  const newReferredUsers = referredUsers || [];

  // If this referred user was already added to the array, we don't want to add them again
  if (newReferredUsers.findIndex(userId => userId === referredUserId) === -1) {
    newReferredUsers.push(referredUserId);
  }

  const params = {
    TableName: tableName,
    Key: { cognitoId },
    UpdateExpression: 'SET referredUsers = :referredUsers',
    ExpressionAttributeValues: { ':referredUsers': newReferredUsers },
  };

  return ddb.update(params);
};
