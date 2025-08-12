const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { getUserByMail } = require('../shared/users/getUsers');
const { PROD_USERS_TABLE_NAME } = require('../config');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));

const unsubscribeUsers = async (tableName, emails) => {
  for (const email of emails) {
    const result = await getUserByMail(tableName, email);

    if (result.Count === 0) {
      console.log('No user found with the passed email', email);
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

  const data = {
    ':newsletterConsent': {
      value: false,
      timestamp,
    },
    ':updatedAt': timestamp,
  };

  let updateExpression;

  // Loop through custom newsletters and set the values to false
  if (typeof customNewsletters !== 'undefined') {
    for (const newsletter of customNewsletters) {
      newsletter.timestamp = timestamp;
      newsletter.value = false;
      newsletter.extraInfo = false;
    }

    data[':customNewsletters'] = customNewsletters;

    updateExpression =
      'set newsletterConsent = :newsletterConsent, customNewsletters = :customNewsletters, updatedAt = :updatedAt';
  } else {
    updateExpression =
      'set newsletterConsent = :newsletterConsent, updatedAt = :updatedAt';
  }

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    });
};

const emails = [];

unsubscribeUsers(PROD_USERS_TABLE_NAME, emails);
