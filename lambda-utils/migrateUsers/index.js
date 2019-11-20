const fs = require('fs');
const randomBytes = require('crypto').randomBytes;
const parse = require('csv-parse');
const Bottleneck = require('bottleneck');
const path = './change_users.csv';
const zipCodeMatcher = require('./zipCodeMatcher');
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);

// AWS Cognito limits to 10 per second, so be safe and do 5 per second
// https://docs.aws.amazon.com/cognito/latest/developerguide/limits.html
const cognitoLimiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });
const dynamoLimiter = new Bottleneck({ minTime: 100, maxConcurrent: 1 });

const tableName = 'Users';
let counter = 0;

const migrateUsers = async () => {
  try {
    const allUsers = await readCsv();
    //filter duplicates
    const newUsers = await filterDuplicates(allUsers);
    // console.log('about to create user: ', allUsers[1]);
    for (let user of newUsers) {
      await createUser(user);
    }
    console.log('count all users', allUsers.length);
  } catch (error) {
    console.log('error while migrating users', error);
  }
};

//reads and parses the csv file and returns a promise containing
//an array of the users
const readCsv = () => {
  const users = [];
  return new Promise(resolve => {
    fs.createReadStream(path)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        const user = {
          email: row[0],
          username: row[1],
          zipCode: zipCodeMatcher.getZipCodeByCity(row[3]),
          optInDate: row[6],
        };
        users.push(user);
      })
      .on('end', () => {
        console.log('finished parsing');
        resolve(users);
      });
  });
};

//goes through array of users and checks for duplicates
const filterDuplicates = async users => {
  const withoutDuplicates = [];
  for (let user of users) {
    if (await userExists(user)) {
      console.log('duplicate');
    } else {
      //push to array, because user does not exist
      withoutDuplicates.push(user);
    }
  }
  return withoutDuplicates;
};

//function that checks if the user already exists
const userExists = async user => {
  try {
    console.log('checking user ', user.email);
    const result = await getUserByMail(user.email);
    //return false if no user was found, true otherwise
    console.log('possible duplicate', result);
    if (result.Count === 0) {
      return false;
    }
    return true;
  } catch (error) {
    console.log('error while getting user by mail', error);
  }
};

const getUserByMail = async email => {
  const params = {
    TableName: tableName,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
  };
  // we don't want to get in trouble with the provisioned throuput
  // which is why we use the limiter here
  const response = await dynamoLimiter.schedule(() =>
    ddb.scan(params).promise()
  );
  return response;
};

const createUser = async user => {
  // AWS Cognito limits to 10 per second, which is why we use limiter
  const response = await cognitoLimiter.schedule(async () => {
    const created = await createUserInCognito(user);
    console.log('new user', created);
    const userId = created.User.Username;
    //confirm user (by setting fake password)
    await confirmUser(userId);
    //create new entry in dynamo
    return await createUserInDynamo(userId, user);
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
      username: user.username,
      zipCode: user.zipCode.toString(),
      //the timestamp of the newsletter consent depends on the change data
      newsletterConsent: { value: true, timestamp: user.optInDate },
      migrated: { source: 'change', createdAtSource: user.optInDate },
    },
  };
  return ddb.put(params).promise();
};

// Generates a random string (e.g. for generating random password)
const getRandomString = length => {
  return randomBytes(length).toString('hex');
};

migrateUsers();
