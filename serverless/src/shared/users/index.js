const AWS = require('aws-sdk');
const { getRandomString } = require('../utils');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = process.env.USERS_TABLE_NAME || 'prod-users';
const userPoolId = process.env.USER_POOL_ID || 'eu-central-1_xx4VmPPdF';

const getUser = userId => {
  return ddb
    .get({
      TableName: tableName,
      Key: {
        cognitoId: userId,
      },
    })
    .promise();
};

const getUserByMail = async (email, startKey = null) => {
  const params = {
    TableName: tableName,
    IndexName: 'emailIndex',
    KeyConditionExpression: 'email = :email',
    // Important: lowercase email
    ExpressionAttributeValues: { ':email': email.toLowerCase() },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  return ddb.query(params).promise();
};

// function to get all users from dynamo
const getAllUsers = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUsers(users, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return users;
};

const getAllUnconfirmedUsers = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression:
      'attribute_not_exists(confirmed) OR #confirmed = :confirmed',
    ExpressionAttributeNames: { '#confirmed': 'confirmed.value' },
    ExpressionAttributeValues: { ':confirmed': false },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUnconfirmedUsers(users, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return users;
};

const getCognitoUser = userId => {
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
  };

  return cognito.adminGetUser(params).promise();
};

const updateNewsletterConsent = (userId, newsletterConsent) => {
  const timestamp = new Date().toISOString();

  const data = {
    ':newsletterConsent': {
      value:
        // If there is no newsletter consent in the request we set it to true
        typeof newsletterConsent !== 'undefined' ? newsletterConsent : true,
      timestamp,
    },
    ':updatedAt': timestamp,
  };

  const updateExpression =
    'set newsletterConsent = :newsletterConsent, updatedAt = :updatedAt';

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

// Create a new cognito user in our user pool
const createUserInCognito = email => {
  const params = {
    UserPoolId: userPoolId,
    Username: email.toLowerCase(),
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
      {
        Name: 'email',
        Value: email.toLowerCase(),
      },
    ],
    MessageAction: 'SUPPRESS', // we don't want to send an "invitation mail"
  };
  return cognito.adminCreateUser(params).promise();
};

// confirm user in cognito by setting a random password
// (need to do it this way, because user is in state force_reset_password)
const confirmUserInCognito = userId => {
  const password = getRandomString(20);
  const setPasswordParams = {
    UserPoolId: userPoolId,
    Username: userId,
    Password: password,
    Permanent: true,
  };
  // set fake password to confirm user
  return cognito.adminSetUserPassword(setPasswordParams).promise();
};

module.exports = {
  getUser,
  getUserByMail,
  getAllUsers,
  getAllUnconfirmedUsers,
  getCognitoUser,
  updateNewsletterConsent,
  createUserInCognito,
  confirmUserInCognito,
};
