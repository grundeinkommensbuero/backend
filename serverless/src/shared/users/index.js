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

//function to get all users from dynamo
const getAllUsers = async (users = [], startKey = null) => {
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
    return getAllUsers(users, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return users;
  }
};

// Checks, if the user is part of the unverified cognito users
// array, returns true if user is verified
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

const getAllUnverifiedCognitoUsers = async (
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
    return getAllUnverifiedCognitoUsers(
      unverifiedCognitoUsers,
      data.PaginationToken
    );
  } else {
    return unverifiedCognitoUsers;
  }
};

module.exports = {
  getUser,
  getUserByMail,
  getAllUsers,
  isVerified,
  getAllUnverifiedCognitoUsers,
};
