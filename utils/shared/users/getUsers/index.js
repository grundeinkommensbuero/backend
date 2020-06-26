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

  let data = await cognito.listUsers(params).promise();

  //add elements of user array
  unverifiedCognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllUnverifiedCognitoUsers(
      userPoolId,
      unverifiedCognitoUsers,
      data.PaginationToken
    );
  } else {
    return unverifiedCognitoUsers;
  }
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

  let data = await cognito.listUsers(params).promise();

  //add elements of user array
  verifiedCognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllVerifiedCognitoUsers(
      userPoolId,
      verifiedCognitoUsers,
      data.PaginationToken
    );
  } else {
    return verifiedCognitoUsers;
  }
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

  let data = await cognito.listUsers(params).promise();

  //add elements of user array
  cognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllCognitoUsers(
      userPoolId,
      cognitoUsers,
      data.PaginationToken
    );
  } else {
    return cognitoUsers;
  }
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

  let data = await cognito.listUsers(params).promise();

  //add elements of user array
  cognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return await getAllCognitoUsers(
      userPoolId,
      cognitoUsers,
      data.PaginationToken
    );
  } else {
    return cognitoUsers;
  }
};

const getUsersFromState = async (tableName, state) => {
  const users = await getAllUsers();
  return users.filter(user => {
    if ('pledges' in user) {
      for (let pledge of user.pledges) {
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
      for (let pledge of user.pledges) {
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

//functions which gets all users and uses the lastEvaluatedKey
//to make multiple requests
const getAllUsers = async (tableName, users = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  //add elements to existing array
  users.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUsers(tableName, users, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return users;
  }
};

//functions which gets all users with pledge and uses the lastEvaluatedKey
//to make multiple requests
const getUsersWithPledge = async (tableName, users = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(pledges)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  //add elements to existing array
  users.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersWithPledge(tableName, users, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return users;
  }
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

  //add elements to existing array
  users.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getUsersWithSurvey(tableName, users, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return users;
  }
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

  for (let cognitoUser of unverifiedCognitoUsers) {
    //sub is the first attribute
    if (user.cognitoId === cognitoUser.Attributes[0].Value) {
      verified = false;
    }
  }

  return verified;
};

module.exports = {
  getAllUsers,
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
};
