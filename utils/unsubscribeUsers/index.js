const AWS = require('aws-sdk');
const { getUserByMail } = require('../shared/users/getUsers');
const { DEV_USERS_TABLE_NAME } = require('../config');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const unsubscribeUsers = async (tableName, emails) => {
  for (const email of emails) {
    const result = await getUserByMail(tableName, email);

    if (result.Count === 0) {
      console.log('No user found with the passed email');
    } else {
      await updateUser(tableName, result.Items[0]);
      console.log('Unsubscribed', email);
    }
  }
};

// Unsubscribe from every newsletter by setting newsletter consent to false,
// as well as setting value in every item in customNewsletters to false
const updateUser = (tableName, { cognitoId, customNewsletters }) => {
  const timestamp = new Date().toISOString();

  // Loop through custom newsletters and set the values to false
  if (typeof customNewsletters !== 'undefined') {
    for (const newsletter of customNewsletters) {
      newsletter.timestamp = timestamp;
      newsletter.value = false;
      newsletter.extraInfo = false;
    }
  }

  const data = {
    ':newsletterConsent': {
      value: false,
      timestamp,
    },
    ':customNewsletters': customNewsletters,
    ':updatedAt': timestamp,
  };

  const updateExpression =
    'set newsletterConsent = :newsletterConsent, customNewsletters = :customNewsletters, updatedAt = :updatedAt';

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const emails = ['valentin@expedition-grundeinkommen.de'];

unsubscribeUsers(DEV_USERS_TABLE_NAME, emails);
