const AWS = require('aws-sdk');
const { getRandomString } = require('../utils');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = process.env.USERS_TABLE_NAME || 'prod-users';
const userPoolId = process.env.USER_POOL_ID || 'eu-central-1_xx4VmPPdF';
const crypto = require('crypto-secure-random-digit');

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

const getUserBySafeAddress = async safeAddress => {
  const params = {
    TableName: tableName,
    IndexName: 'safeAddressIndex',
    KeyConditionExpression: 'circlesSafeAddress = :safeAddress',
    ExpressionAttributeValues: { ':safeAddress': safeAddress },
  };

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

const getUsersWithDonations = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(donations)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersWithDonations(users, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return users;
};

const getCollectors = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(wantsToCollect)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getCollectors(users, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return users;
};

const getAllUnconfirmedUsers = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression:
      'attribute_not_exists(confirmed) OR #key1.#key2 = :confirmed',
    ExpressionAttributeNames: { '#key1': 'confirmed', '#key2': 'value' },
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

const getReferredUsers = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(#key1.#key2)',
    ExpressionAttributeNames: { '#key1': 'store', '#key2': 'referredByUser' },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getReferredUsers(users, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return users;
};

const getUsersWithScannedLists = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(scannedLists)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersWithScannedLists(users, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return users;
};

// Bring your lists to work is a campaign started during the second phase of berlin campaign
const getUsersForListsToWork = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(#store.#listsToWork)',
    ExpressionAttributeNames: {
      '#store': 'store',
      '#listsToWork': 'listsToWork',
    },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersForListsToWork(users, result.LastEvaluatedKey);
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

// Stores challenge as a custom attribute in Cognito,
// returns new login code
// The function offers an overwrite for the user pool id, because some serverless functions
// might not have env variable due to circular dependency
const createLoginCode = async ({ email, userId, userPoolIdOverwrite }) => {
  const secretLoginCode = crypto.randomDigits(6).join('');

  await cognito
    .adminUpdateUserAttributes({
      UserAttributes: [
        {
          Name: 'custom:authChallenge',
          Value: `${secretLoginCode},${Math.round(
            new Date().valueOf() / 1000
          )}`,
        },
      ],
      UserPoolId: userPoolIdOverwrite || userPoolId,
      Username: email || userId,
    })
    .promise();

  return secretLoginCode;
};

const getAllCognitoUsers = async (
  cognitoUsers = [],
  paginationToken = null
) => {
  const params = {
    UserPoolId: userPoolId,
    PaginationToken: paginationToken,
  };

  const data = await cognito.listUsers(params).promise();

  // add elements of user array
  cognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllCognitoUsers(cognitoUsers, data.PaginationToken);
  }
  return cognitoUsers;
};

// Unsubscribe from every newsletter by setting newsletter consent and reminderMails to false,
// as well as setting value in every item in customNewsletters to false
const unsubscribeUser = ({ cognitoId, customNewsletters }) => {
  const timestamp = new Date().toISOString();

  const data = {
    ':newsletterConsent': {
      value: false,
      timestamp,
    },
    ':reminderMails': {
      value: false,
      timestamp,
    },
    ':updatedAt': timestamp,
  };

  // Loop through custom newsletters and set the values to false
  if (typeof customNewsletters !== 'undefined') {
    for (const newsletter of customNewsletters) {
      newsletter.timestamp = timestamp;
      newsletter.value = false;
      newsletter.extraInfo = false;
    }

    data[':customNewsletters'] = customNewsletters;
  }

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId },
      UpdateExpression: `SET newsletterConsent = :newsletterConsent,
      reminderMails = :reminderMails,
      ${
        ':customNewsletters' in data
          ? 'customNewsletters = :customNewsletters,'
          : ''
      } updatedAt = :updatedAt`,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const deleteUserInCognito = userId => {
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
  };

  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = userId => {
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: userId,
    },
  };

  return ddb.delete(params).promise();
};

module.exports = {
  getUser,
  getUserByMail,
  getUserBySafeAddress,
  getAllUsers,
  getAllUnconfirmedUsers,
  getReferredUsers,
  getCognitoUser,
  updateNewsletterConsent,
  createUserInCognito,
  confirmUserInCognito,
  getUsersWithDonations,
  getUsersWithScannedLists,
  getUsersForListsToWork,
  getCollectors,
  createLoginCode,
  getAllCognitoUsers,
  unsubscribeUser,
  deleteUserInCognito,
  deleteUserInDynamo,
};
