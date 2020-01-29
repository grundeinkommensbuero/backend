const fs = require('fs');
const parse = require('csv-parse');
const Bottleneck = require('bottleneck');
const paths = {
  mailerlite: './data/mailerlite_users.csv',
  change: './data/change_users.csv',
  signaturesTest: './data/signatures_test_users.csv',
  typeform: './data/typeform_users.csv',
};
const zipCodeMatcher = require('./zipCodeMatcher');
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const { getUserByMail } = require('../shared/users/getUsers');
const {
  confirmUser,
  createUserInCognito,
  createUserInDynamo: recreateUserInDynamo,
} = require('../shared/users/createUsers');

const CONFIG = require('../config');
const tableName = CONFIG.PROD_TABLE_NAME;
const userPoolId = CONFIG.PROD_USER_POOL_ID;

// AWS Cognito limits to 10 per second, so be safe and do 5 per second
// https://docs.aws.amazon.com/cognito/latest/developerguide/limits.html
const cognitoLimiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });

const processTypeformUsers = async () => {
  try {
    const allUsers = await readCsv('typeform');

    //add new users to database
    for (let user of allUsers) {
      const result = await getUserByMail(tableName, user.email);

      // only update pinpoint for the users we already have in dynamo
      if (result.Count !== 0) {
        user.userId = result.Items[0].cognitoId;
        console.log('processing', user.userId);
        await addKickOffToPinpoint(user);
      } else {
        //if the user is not in dynamo create new user
        //if user wants to (newsletter flag)
        if (user.newsletter) {
          // await createUser(user);
        }
      }
    }
  } catch (error) {
    console.log('error', error);
  }
};

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
    const changeUsers = await readCsv('change');
    const mailerliteUsers = await readCsv('mailerlite');

    //remove duplicates between mailerlite and change
    //we want to keep change because of existing location
    const mailerliteUsersWithoutDuplicates = mailerliteUsers.filter(
      mailerliteUser =>
        changeUsers.findIndex(
          changeUser => changeUser.email === mailerliteUser.email
        ) === -1
    );

    //merge both arrays into one
    const allUsers = changeUsers.concat(mailerliteUsersWithoutDuplicates);

    //filter duplicates with already existing users in our db
    const newUsers = await filterDuplicates(allUsers);

    for (let user of newUsers) {
      try {
        await createUser(user);
      } catch (error) {
        if (error.code === 'UsernameExistsException') {
          console.log('user exists', user.email, error);
        }
      }
    }

    console.log('change users', changeUsers.length);
    console.log('mailerlite users', mailerliteUsersWithoutDuplicates.length);
    console.log('all users', allUsers.length);
    console.log('minus duplicates', newUsers.length);
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
          if (source === 'change') {
            user = {
              email: row[0],
              username: row[1],
              zipCode: zipCodeMatcher.getZipCodeByCity(row[3]),
              createdAt: new Date(row[6]).toISOString(),
              source: source,
            };
          } else if (source === 'mailerlite') {
            user = {
              email: row[0],
              //TODO: parse date to make it same as others
              createdAt: new Date(row[4]).toISOString(),
              timestampConfirmation: new Date(row[9]).toISOString(),
              source: source,
            };
          } else if (source === 'typeform') {
            //only add user if there is a mail
            if (row[1] !== '' || row[2] !== '') {
              const date = new Date(row[3]);
              console.log('date', date);
              user = {
                email: row[1] !== '' ? row[1] : row[2],
                newsletter: row[1] !== '' ? true : false,
                createdAt: date.toISOString(),
                source: source,
                kickOff: row[0],
                phoneNumber: row[4] !== '' ? row[4] : 'k.A.',
              };
            }
          } else {
            user = {
              email: row[0],
              username: 'Test-Unterschriftenliste',
              createdAt: new Date().toISOString(),
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

//goes through array of users and checks for duplicates
const filterDuplicates = async users => {
  const withoutDuplicates = [];
  const duplicates = [];
  for (let user of users) {
    if (await userExists(user)) {
      console.log('duplicate');
      duplicates.push(user.email);
    } else {
      //push to array, because user does not exist
      withoutDuplicates.push(user);
    }
  }
  console.log('duplicates', duplicates);
  return withoutDuplicates;
};

//function that checks if the user already exists
const userExists = async user => {
  try {
    console.log('checking user ', user.email);
    const result = await getUserByMail(user.email);
    //return false if no user was found, true otherwise
    if (result.Count === 0) {
      return false;
    }
    return true;
  } catch (error) {
    console.log('error while getting user by mail', error);
  }
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
