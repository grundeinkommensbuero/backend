const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const fs = require('fs');
const parse = require('csv-parse');
const Bottleneck = require('bottleneck');
const zipCodeMatcher = require('../shared/zipCodeMatcher');

// const paths = {
//   mailerlite: './data/mailerlite_users.csv',
//   change: './data/change_users.csv',
//   'change-2': './data/change_users_2.csv',
//   signaturesTest: './data/signatures_test_users.csv',
//   typeform: './data/Ergebnisse Briefaktion.csv',
//   olympia: './data/olympia_210414.csv',
// };

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));
const {
  confirmUser,
  createUserInCognito,
  createUserInDynamo: recreateUserInDynamo,
} = require('../shared/users/createUsers');

const CONFIG = require('../config');
const { transformDate } = require('../shared/utils');

const tableName = CONFIG.PROD_USERS_TABLE_NAME;
const userPoolId = CONFIG.PROD_USER_POOL_ID;

// AWS Cognito limits to 10 per second, so be safe and do x per second
// https://docs.aws.amazon.com/cognito/latest/developerguide/limits.html
const cognitoLimiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });

// if we want to "manually" add a single user (e.g. after someone asks as via mail)
// eslint-disable-next-line no-unused-vars
const addUser = async (email, username) => {
  const date = new Date();
  const timestamp = date.toISOString();
  const user = {
    email,
    username,
    source: 'manually',
    createdAt: timestamp,
  };

  await createUser(user);
};

// eslint-disable-next-line no-unused-vars
const migrateUsers = async () => {
  try {
    const users = await readCsv('olympia');
    let alreadyExistedCount = 0;
    let count = 0;

    for (const user of users) {
      try {
        await createUser(user);

        console.log('processed', count++, users.length, user.email);
      } catch (error) {
        if (error.code === 'UsernameExistsException') {
          console.log('user exists', user.email);
          alreadyExistedCount++;
        } else {
          console.log('different error', error);
        }
      }
    }

    console.log('already existed', alreadyExistedCount);
  } catch (error) {
    console.log('error while migrating users', error);
  }
};

// reads and parses the csv file and returns a promise containing
// an array of the users
const readCsv = source => {
  return new Promise(resolve => {
    const users = [];
    const path = paths[source];
    let count = 0;
    fs.createReadStream(path)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        // leave out headers
        if (count > 0) {
          console.log('row', row);
          if (source === 'typeform') {
            if (row[9] !== '' || row[12] !== '') {
              user = {
                email: row[12] !== '' ? row[12] : row[9],
                zipCode: row[7],
                createdAt: new Date(transformDate(row[20])).toISOString(),
                source: 'typeform-bge',
              };
            }
          } else if (source === 'mailerlite') {
            user = {
              email: row[0],
              createdAt: new Date(row[4]).toISOString(),
              timestampConfirmation: new Date(row[9]).toISOString(),
              source,
            };
          } else if (source === 'change' || source === 'change-2') {
            user = {
              email: row[0],
              username: row[2],
              zipCode: zipCodeMatcher.getZipCodeByCity(row[11]),
              createdAt: new Date(transformDate(row[10])).toISOString(),
              source,
            };
          } else if (source === 'olympia') {
            // Only if newsletter is "ja" we want to add the user
            if (row[11] === 'ja') {
              user = {
                email: row[1],
                username: row[3],
                zipCode: row[7],
                city: row[8],
                createdAt: new Date(transformDate(row[12])).toISOString(),
                source,
              };
            }
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
    const created = await createUserInCognito(
      userPoolId,
      user.email.toLowerCase(),
      user.source === 'typeform-bb-platform' ? 'bb-platform' : null
    );
    console.log('new user', created);

    const userId = created.User.Username;

    // confirm user (by setting fake password)
    await confirmUser(userPoolId, userId);

    // create new entry in dynamo or recreate the old one
    if (recreate) {
      return await recreateUserInDynamo(tableName, userId, user);
    }
    return await createUserInDynamo(userId, user);
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
      email: user.email.toLowerCase(),
      confirmed: {
        value: true,
        timestamp,
      },
      createdAt: timestamp,
      // username and zipCode might be undefined, the key will just be
      // left out in dynamo
      username: user.username,
      zipCode: user.zipCode,
      city: user.city,
      // the timestamp of the newsletter consent depends on the change data
      newsletterConsent: {
        value: true,
        timestamp:
          user.source !== 'mailerlite'
            ? user.createdAt
            : user.timestampConfirmation,
      },
      migrated: { source: user.source, createdAtSource: user.createdAt },
      // If the user is being migrated from the typeform for
      // lists via mail for the bb platform then we also need to define the
      // sign up source, otherwise there might be issues on xbge.de
      source:
        user.source === 'typeform-bb-platform' ? 'bb-platform' : undefined,
    },
  };
  return ddb.put(params);
};

module.exports = { createUser };

// migrateUsers();
