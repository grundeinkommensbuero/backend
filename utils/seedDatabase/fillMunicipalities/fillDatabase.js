const signups = require('./output/mockup-complete.json');
const { DEV_USER_MUNICIPALITY_TABLE_NAME } = require('../../config');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const Bottleneck = require('bottleneck');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 4 });

const fillDatabase = async () => {
  for (const signup of signups) {
    await limiter.schedule(async () => {
      for (let i = 0; i < signup.signups; i++) {
        await updateUserMunicipalityTable(
          signup.ags,
          uuidv4(),
          createRandomDate().toISOString(),
          signup.population
        );
      }

      console.log('Updated', signup.ags);
    });
  }
};

const updateUserMunicipalityTable = (ags, userId, createdAt, population) => {
  const params = {
    TableName: DEV_USER_MUNICIPALITY_TABLE_NAME,
    Item: {
      ags,
      userId,
      createdAt,
      population,
    },
  };

  return ddb.put(params);
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

fillDatabase();
