const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');
const randomBytes = require('crypto').randomBytes;

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = 'dev-users';
const userPoolId = 'eu-central-1_SYtDaO0qH';

// AWS Cognito limits to 10 per second, so be safe and do leet per second
// https://docs.aws.amazon.com/cognito/latest/developerguide/limits.html
const cognitoLimiter = new Bottleneck({ minTime: 150, maxConcurrent: 4 });

const seedCount = 50000;

const seedDatabase = async () => {
  try {
    for (let i = 0; i < seedCount; i++) {
      const user = {
        email: `test${i}@expedition-grundeinkommen.de`,
        username: `testName${i}`,
        zipCode: '00000',
      };

      await createUser(user);
    }
  } catch (error) {
    console.log('error while seeding db', error);
  }
};

const createUser = async user => {
  // AWS Cognito limits to 10 per second, which is why we use limiter
  const response = await cognitoLimiter.schedule(async () => {
    const created = await createUserInCognito(user);

    console.log('new user', created);
    const userId = created.User.Username;

    //confirm user (by setting fake password)

    await confirmUser(userId);
    //create new entry in dynamo or recreate the old one
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
      email: user.email,
      createdAt: timestamp,
      //username and zipCode might be undefined, the key will just be
      //left out in dynamo
      username: user.username,
      zipCode: user.zipCode,
      //the timestamp of the newsletter consent depends on the change data
      newsletterConsent: {
        value: true,
        timestamp: timestamp,
      },
      pledges: [
        {
          campaign: { code: 'test-0', round: 0, state: 'state' },
          signatureCount: 5,
          createdAt: timestamp,
        },
      ],
    },
  };
  return ddb.put(params).promise();
};

//Create a new cognito user in our user pool
const createUserInCognito = user => {
  params = {
    UserPoolId: userPoolId,
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
    UserPoolId: userPoolId,
    Username: userId,
    Password: password,
    Permanent: true,
  };
  //set fake password to confirm user
  return cognito.adminSetUserPassword(setPasswordParams).promise();
};

// Generates a random string (e.g. for generating random password)
const getRandomString = length => {
  return randomBytes(length).toString('hex');
};

seedDatabase();
