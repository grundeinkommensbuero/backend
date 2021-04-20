const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);

const getCognitoUser = async (userPoolId, userId) => {
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
  };

  return cognito.adminGetUser(params).promise();
};

const getAllUnverifiedCognitoUsers = async (
  userPoolId,
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
      userPoolId,
      unverifiedCognitoUsers,
      data.PaginationToken
    );
  }
  return unverifiedCognitoUsers;
};

const getAllVerifiedCognitoUsers = async (
  userPoolId,
  verifiedCognitoUsers = [],
  paginationToken = null
) => {
  const params = {
    UserPoolId: userPoolId,
    Filter: 'cognito:user_status = "CONFIRMED"',
    PaginationToken: paginationToken,
  };

  const data = await cognito.listUsers(params).promise();

  // add elements of user array
  verifiedCognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllVerifiedCognitoUsers(
      userPoolId,
      verifiedCognitoUsers,
      data.PaginationToken
    );
  }
  return verifiedCognitoUsers;
};

const getAllCognitoUsers = async (
  userPoolId,
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
    return await getAllCognitoUsers(
      userPoolId,
      cognitoUsers,
      data.PaginationToken
    );
  }
  return cognitoUsers;
};

const getAllCognitoUsersWithUnverifiedEmails = async (
  userPoolId,
  cognitoUsers = [],
  paginationToken = null
) => {
  const params = {
    UserPoolId: userPoolId,
    PaginationToken: paginationToken,
    Filter: 'cognito:user_status = "UNCONFIRMED"',
  };

  const data = await cognito.listUsers(params).promise();

  // add elements of user array
  cognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllCognitoUsers(
      userPoolId,
      cognitoUsers,
      data.PaginationToken
    );
  }
  return cognitoUsers;
};

const getUsersFromState = async (tableName, state) => {
  const users = await getAllUsers();
  return users.filter(user => {
    if ('pledges' in user) {
      for (const pledge of user.pledges) {
        return pledge.campaign.state === state;
      }
    }
    return false;
  });
};

const getUsersWithoutNewsletterFromState = async (tableName, state) => {
  const users = await getAllUsers(tableName);

  return users.filter(user => {
    if ('pledges' in user) {
      for (const pledge of user.pledges) {
        if (pledge.campaign.state === state) {
          if ('newsletterConsent' in user) {
            return !user.newsletterConsent.value;
          }
        }
      }
    }
    return false;
  });
};

// Function which gets all users and uses the lastEvaluatedKey
// to make multiple requests. You can optionally add a filter condition.
const getAllUsers = async (
  tableName,
  condition = null,
  conditionValue = null,
  users = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  if (condition !== null) {
    params.FilterExpression = condition;
    params.ExpressionAttributeValues = {
      ':conditionValue': conditionValue,
    };
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUsers(
      tableName,
      condition,
      conditionValue,
      users,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return users;
};

// New function to get unconfirmed user after refactoring
const getAllUnconfirmedUsers = async (
  tableName,
  users = [],
  startKey = null
) => {
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
    return await getAllUnconfirmedUsers(
      tableName,
      users,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return users;
};

// functions which gets all users with pledge and uses the lastEvaluatedKey
// to make multiple requests
const getUsersWithPledge = async (tableName, users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(pledges)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersWithPledge(tableName, users, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return users;
};

const getUsersWithSurvey = async (tableName, users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(surveys)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersWithSurvey(tableName, users, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return users;
};

const getUsersWithDonations = async (
  tableName,
  users = [],
  startKey = null
) => {
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
    return await getUsersWithDonations(
      tableName,
      users,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return users;
};

const getUser = (tableName, id) => {
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: id,
    },
  };

  return ddb.get(params).promise();
};

const getUserByMail = async (tableName, email) => {
  const params = {
    TableName: tableName,
    IndexName: 'emailIndex',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() },
  };

  return ddb.query(params).promise();
};

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

module.exports = {
  getAllUsers,
  getAllUnconfirmedUsers,
  getAllCognitoUsers,
  getAllUnverifiedCognitoUsers,
  getUser,
  getUserByMail,
  getUsersFromState,
  getUsersWithoutNewsletterFromState,
  isVerified,
  getUsersWithSurvey,
  getCognitoUser,
  getAllVerifiedCognitoUsers,
  getUsersWithPledge,
  getAllCognitoUsersWithUnverifiedEmails,
  getUsersWithDonations,
};
