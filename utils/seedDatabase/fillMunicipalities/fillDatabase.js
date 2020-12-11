const signups = require('./output/signups.json');
const { DEV_MUNICIPALITIES_TABLE_NAME } = require('../../config');
const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');
const uuid = require('uuid/v4');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 4 });

const fillDatabase = async () => {
  for (const signup of signups) {
    await limiter.schedule(async () => {
      const users = [];
      for (let i = 0; i < signups.signups; i++) {
        users.push({ id: uuid(), createdAt: createRandomDate() });
      }

      await updateMunicipality(signup.ags, users);
    });
  }
};

const updateMunicipality = (ags, users) => {
  const params = {
    TableName: DEV_MUNICIPALITIES_TABLE_NAME,
    Key: { ags },
    UpdateExpression: 'SET #attribute = :users',
    ExpressionAttributeValues: {
      ':users': users,
    },
    ExpressionAttributeNames: {
      '#attribute': 'users',
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

const createRandomDate = () => {
  const date = new Date();
  const pastDate = new Date();

  pastDate.setDate(date.getDate() - 4);

  const randomDate = new Date(
    pastDate.getTime() +
      Math.floor(Math.random() * (date.getTime() - pastDate.getTime())) +
      1
  );

  return randomDate;
};
