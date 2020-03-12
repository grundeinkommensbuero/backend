const fs = require('fs');
const parse = require('csv-parse');
const Bottleneck = require('bottleneck');
const paths = {
  mailerlite: './data/mailerlite_users.csv',
  change: './data/change_users.csv',
  signaturesTest: './data/signatures_test_users.csv',
  typeform: './data/Ergebnisse Briefaktion.csv',
};
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const {
  confirmUser,
  createUserInCognito,
  createUserInDynamo: recreateUserInDynamo,
} = require('../shared/users/createUsers');

const CONFIG = require('../config');
const tableName = CONFIG.PROD_TABLE_NAME;
const userPoolId = CONFIG.PROD_USER_POOL_ID;

// AWS Cognito limits to 10 per second, so be safe and do x per second
// https://docs.aws.amazon.com/cognito/latest/developerguide/limits.html
const cognitoLimiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });

//if we want to "manually" add a single user (e.g. after someone asks as via mail)
const addUser = async (email, username) => {
  const date = new Date();
  const timestamp = date.toISOString();
  const user = {
    email: email,
    username: username,
    source: 'manually',
    createdAt: timestamp,
  };

  await createUser(user);
};

const migrateUsers = async () => {
  try {
    const users = await readCsv('typeform');

    console.log('user', users[0]);

    for (let user of users) {
      try {
        await createUser(user);
      } catch (error) {
        if (error.code === 'UsernameExistsException') {
          console.log('user exists', user.email);
        } else {
          console.log('different error', error);
        }
      }
    }
  } catch (error) {
    console.log('error while migrating users', error);
  }
};

//reads and parses the csv file and returns a promise containing
//an array of the users
const readCsv = source => {
  return new Promise(resolve => {
    const users = [];
    const path = paths[source];
    let count = 0;
    fs.createReadStream(path)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        //leave out headers
        if (count > 0) {
          console.log('row', row);
          if (source === 'typeform') {
            if ((row[10] === '' || row[10] === 'xxxxx') && row[7] !== '') {
              user = {
                email: row[7],
                zipCode: row[6].split(' ')[0],
                createdAt: new Date(transformDate(row[14])).toISOString(),
                source: 'typeform-bge',
              };
            }
          } else if (source === 'mailerlite') {
            user = {
              email: row[0],
              //TODO: parse date to make it same as others
              createdAt: new Date(row[4]).toISOString(),
              timestampConfirmation: new Date(row[9]).toISOString(),
              source: source,
            };
          }

          if (typeof user !== 'undefined') {
            users.push(user);
          }
        }

        count++;
      })
      .on('end', () => {
        console.log('finished parsing', source);
        resolve(users);
      });
  });
};

const createUser = async (user, recreate = false) => {
  // AWS Cognito limits to 10 per second, which is why we use limiter
  const response = await cognitoLimiter.schedule(async () => {
    const created = await createUserInCognito(userPoolId, user.email);
    console.log('new user', created);

    const userId = created.User.Username;

    //confirm user (by setting fake password)
    await confirmUser(userPoolId, userId);

    //create new entry in dynamo or recreate the old one
    if (recreate) {
      return await recreateUserInDynamo(tableName, userId, user);
    } else {
      return await createUserInDynamo(userId, user);
    }
  });
  return response;
};

const createUserInDynamo = (userId, user) => {
  const date = new Date();
  const timestamp = date.toISOString();
  const params = {
    TableName: tableName,
    Item: {
      cognitoId: userId,
      email: user.email,
      createdAt: timestamp,
      //username and zipCode might be undefined, the key will just be
      //left out in dynamo
      username: user.username,
      zipCode: user.zipCode,
      //the timestamp of the newsletter consent depends on the change data
      newsletterConsent: {
        value: true,
        timestamp:
          user.source !== 'mailerlite'
            ? user.createdAt
            : user.timestampConfirmation,
      },
      migrated: { source: user.source, createdAtSource: user.createdAt },
    },
  };
  return ddb.put(params).promise();
};

// Transforms date from e.g. 13.02.2020 00:52:51 to 02.13.2020 00:52:51
const transformDate = date => {
  const dateArray = date.split('.');
  return `${dateArray[1]}.${dateArray[0]}.${dateArray[2]}`;
};

migrateUsers();
