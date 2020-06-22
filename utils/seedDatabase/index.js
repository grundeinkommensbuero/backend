const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const {
  confirmUser,
  createUserInCognito,
} = require('../shared/users/createUsers');

const CONFIG = require('../config');

const tableName = CONFIG.DEV_TABLE_NAME;
const userPoolId = CONFIG.DEV_USER_POOL_ID;

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
    const created = await createUserInCognito(userPoolId, user.email);

    console.log('new user', created);
    const userId = created.User.Username;

    // confirm user (by setting fake password)

    await confirmUser(userPoolId, userId);
    // create new entry in dynamo or recreate the old one
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
      // username and zipCode might be undefined, the key will just be
      // left out in dynamo
      username: user.username,
      zipCode: user.zipCode,
      // the timestamp of the newsletter consent depends on the change data
      newsletterConsent: {
        value: true,
        timestamp,
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

seedDatabase();
