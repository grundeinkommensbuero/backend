const AWS = require('aws-sdk');

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

// Checks, if the user is part of the unverified cognito users
// array, returns true if user is verified
const isVerified = (user, unverifiedCognitoUsers) => {
  let verified = true;

  for (const cognitoUser of unverifiedCognitoUsers) {
    // sub is the first attribute
    if (user.cognitoId === cognitoUser.Attributes[0].Value) {
      verified = false;
    }
  }

  return verified;
};

const getAllUnverifiedCognitoUsers = async (
  unverifiedCognitoUsers = [],
  paginationToken = null
) => {
  const params = {
    UserPoolId: userPoolId,
    Filter: 'cognito:user_status = "UNCONFIRMED"',
    PaginationToken: paginationToken,
  };

  const data = await cognito.listUsers(params).promise();

  // add elements of user array
  unverifiedCognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllUnverifiedCognitoUsers(
      unverifiedCognitoUsers,
      data.PaginationToken
    );
  }
  return unverifiedCognitoUsers;
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

module.exports = {
  getUser,
  getUserByMail,
  getAllUsers,
  isVerified,
  getAllUnverifiedCognitoUsers,
  getCognitoUser,
  updateNewsletterConsent,
};
