/**
 * This lambda is used to update the dynamo db by:
 * - renaming pledge key to something more specific (schleswig-holstein-1)
 * - add timestamp to newsletter consent
 */

const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;

exports.handler = async event => {
  try {
    const users = await getAllUsers();
    for (let user of users.Items) {
      console.log('user', user);
      // check if user contains a valid pledge for the key 'pledge'
      if ('pledge' in user && typeof user.pledge === 'object') {
        //update name of pledge key/column
        try {
          const result = await changePledgeKey(user);
          console.log('success changing pledge key', result);
        } catch (error) {
          console.log('error changing pledge key', error);
          break; //if there is something wrong, we want to break out of the loop
        }
      }
      //refactor newsletter consent to use format {value: boolean, timestamp: string} instead of boolean
      //check if it is still in old format
      if (typeof user.newsletterConsent === 'boolean') {
        console.log('old format');
        try {
          const result = await changeNewsletterConsent(user);
          console.log('success changing newsletter consent', result);
        } catch (error) {
          console.log('error changing newsletter consent', error);
          break; //if there is something wrong, we want to break out of the loop
        }
      }
    }
  } catch (error) {
    console.log('error while fetching users from db', error);
  }
  return event;
};

const getAllUsers = () => {
  const params = {
    TableName: tableName,
    ProjectionExpression: 'cognitoId, pledge, newsletterConsent, createdAt',
  };
  return ddb.scan(params).promise();
};

// function to move pledge object to new key
const changePledgeKey = user => {
  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: user.cognitoId },
      UpdateExpression: 'SET #pledgeKey = :pledge REMOVE pledge',
      ExpressionAttributeValues: { ':pledge': user.pledge },
      ExpressionAttributeNames: {
        '#pledgeKey': 'pledge-schleswig-holstein-1', //to work properly we need to use a placeholder (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html#ExpressionAttributeNames)
      },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const changeNewsletterConsent = user => {
  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: user.cognitoId },
      UpdateExpression: 'SET newsletterConsent = :newsletterConsent',
      ExpressionAttributeValues: {
        ':newsletterConsent': {
          value: user.newsletterConsent,
          timestamp: user.createdAt,
        },
      },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};
