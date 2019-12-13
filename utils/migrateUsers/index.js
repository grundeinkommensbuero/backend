const fs = require('fs');
const randomBytes = require('crypto').randomBytes;
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
const { updateEndpoint, addKickOffToPinpoint } = require('../fillPinpoint');
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);

// AWS Cognito limits to 10 per second, so be safe and do 5 per second
// https://docs.aws.amazon.com/cognito/latest/developerguide/limits.html
const cognitoLimiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });

const tableName = 'Users';
const tableNameBackup = 'UsersWithoutConsent-14-11';
const tableNameBackup2 = 'UsersWithoutConsent-02-12';

const processTypeformUsers = async () => {
  try {
    const allUsers = await readCsv('typeform');

    //add new users to database
    for (let user of allUsers) {
      const result = await getUserByMail(user.email);
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

const addTestUsers = async () => {
  try {
    const allUsers = await readCsv('signaturesTest');
    //filter duplicates with already existing users in our db
    const newUsers = await filterDuplicates(allUsers);

    for (let user of newUsers) {
      await createUser(user);
    }
  } catch (error) {
    console.log('error', error);
  }
};

const addUsersFromBackupToPinpoint = async () => {
  try {
    const result = await getUsersFromBackup(tableNameBackup);
    const backupUsers = result.Items;
    //only get users without newsletter consent
    const backupUsersWithoutConsent = backupUsers.filter(
      user => 'newsletterConsent' in user && !user.newsletterConsent.value
    );

    //filter duplicates with already existing users in our db (unlikely)
    const newUsers = await filterDuplicates(backupUsersWithoutConsent);
    for (let user of newUsers) {
      await updateEndpoint(user);
    }
    console.log(
      'users length',
      backupUsers.length,
      backupUsersWithoutConsent.length,
      newUsers.length
    );
  } catch (error) {
    console.log('error', error);
  }
};

const addUserFromBackup = async email => {
  try {
    const result = await getUsersFromBackup(tableNameBackup2);
    const backupUsers = result.Items;
    const foundUser = backupUsers.find(
      backupUser => email === backupUser.email
    );
    console.log('user to recreate', foundUser);
    //true, because we want to recreate the old user
    await createUser(foundUser, true);
  } catch (error) {
    console.log('error', error);
  }
};

//if we want to "manually" add a single user (e.g. after someone asks as via mail)
const addUser = async email => {
  const date = new Date();
  const timestamp = date.toISOString();
  const user = {
    email: email,
    username: 'Svenja',
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

const getUserByMail = async (email, startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }
  const result = await ddb.scan(params).promise();
  //call same function again, if there is no user found, but not
  //the whole db has been scanned
  if (result.Count === 0 && 'LastEvaluatedKey' in result) {
    return getUserByMail(email, result.LastEvaluatedKey);
  } else {
    return result;
  }
};

const createUser = async (user, recreate = false) => {
  // AWS Cognito limits to 10 per second, which is why we use limiter
  const response = await cognitoLimiter.schedule(async () => {
    const created = await createUserInCognito(user);
    console.log('new user', created);
    const userId = created.User.Username;
    //confirm user (by setting fake password)
    await confirmUser(userId);
    //create new entry in dynamo or recreate the old one
    if (recreate) {
      return await recreateUserInDynamo(userId, user);
    } else {
      return await createUserInDynamo(userId, user);
    }
  });
  return response;
};

//Create a new cognito user in our user pool
const createUserInCognito = user => {
  params = {
    UserPoolId: 'eu-central-1_74vNy5Iw0',
    Username: user.email,
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
      {
        Name: 'email',
        Value: user.email,
      },
    ],
    MessageAction: 'SUPPRESS', //we don't want to send an "invitation mail"
  };
  return cognito.adminCreateUser(params).promise();
};

//confirm user by setting a random password
//(need to do it this way, because user is in state force_reset_password)
const confirmUser = userId => {
  const password = getRandomString(20);
  const setPasswordParams = {
    UserPoolId: 'eu-central-1_74vNy5Iw0',
    Username: userId,
    Password: password,
    Permanent: true,
  };
  //set fake password to confirm user
  return cognito.adminSetUserPassword(setPasswordParams).promise();
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

const recreateUserInDynamo = (userId, user) => {
  const params = {
    TableName: tableName,
    Item: {
      cognitoId: userId,
      email: user.email,
      createdAt: user.createdAt,
      username: user.username,
      zipCode: user.zipCode,
      newsletterConsent: user.newsletterConsent,
      pledges: user.pledges,
      referral: user.referral,
    },
  };
  return ddb.put(params).promise();
};

// Generates a random string (e.g. for generating random password)
const getRandomString = length => {
  return randomBytes(length).toString('hex');
};

const getUsersFromBackup = tableName => {
  const params = {
    TableName: tableName,
  };
  return ddb.scan(params).promise();
};

// migrateUsers();
// addTestUsers();
// addUsersFromBackupToPinpoint();
// addUserFromBackup('sonnenzeit22@web.de');
// addUser('Svenja.Gruber@gmx.net');

processTypeformUsers();
