const { getAllUsers } = require('../../shared/users/getUsers');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const { DEV_USERS_TABLE_NAME } = require('../../config');

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 2 });

const refactorSettings = async () => {
  const users = await getAllUsers(DEV_USERS_TABLE_NAME);
  let count = 0;

  for (const user of users) {
    await limiter.schedule(async () => {
      await refactorUser(user);
    });
    console.log('refactored', user.cognitoId, count++);
  }
};

const refactorUser = async user => {
  let reminderMails;
  let updateExpression;
  if ('transactionalConsent' in user) {
    console.log('had transactions consent key', user.cognitoId);
    reminderMails = user.transactionalConsent;
    updateExpression =
      'SET reminderMails =  :reminderMails REMOVE transactionalConsent';
  } else {
    reminderMails = user.newsletterConsent || {
      value: true,
      timestamp: new Date().toISOString,
    };
    updateExpression = 'SET reminderMails =  :reminderMails';
  }

  const params = {
    TableName: DEV_USERS_TABLE_NAME,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: updateExpression,
    ExpressionAttributeValues: {
      ':reminderMails': reminderMails,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  await ddb.update(params).promise();
};

refactorSettings();
