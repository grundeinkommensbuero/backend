const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = 'Users';
const userPoolId = 'eu-central-1_74vNy5Iw0';

const getAllUnverifiedCognitoUsers = async () => {
  let unverifiedCognitoUsers = [];
  let data = await getUnverifiedCognitoUsers(null);
  //add elements of user array
  unverifiedCognitoUsers.push(...data.Users);
  while ('PaginationToken' in data) {
    data = await getUnverifiedCognitoUsers(data.PaginationToken);
    //add elements of user array
    unverifiedCognitoUsers.push(...data.Users);
  }
  return unverifiedCognitoUsers;
};

//This functions only fetches the maximum of 60 users
const getUnverifiedCognitoUsers = paginationToken => {
  const params = {
    UserPoolId: 'eu-central-1_74vNy5Iw0',
    Filter: 'cognito:user_status = "UNCONFIRMED"',
    PaginationToken: paginationToken,
  };
  //get all users, which are not verified from user pool
  return cognito.listUsers(params).promise();
};

const getAllCognitoUsers = async () => {
  let cognitoUsers = [];
  let data = await getCognitoUsers(null);
  //add elements of user array
  cognitoUsers.push(...data.Users);
  while ('PaginationToken' in data) {
    data = await getCognitoUsers(data.PaginationToken);
    //add elements of user array
    cognitoUsers.push(...data.Users);
  }
  return cognitoUsers;
};

//This functions only fetches the maximum of 60 users
const getCognitoUsers = paginationToken => {
  const params = {
    UserPoolId: userPoolId,
    PaginationToken: paginationToken,
  };
  //get all users, which are not verified from user pool
  return cognito.listUsers(params).promise();
};

const getUsersFromSh = async () => {
  const users = await getAllUsers();
  return users.filter(user => {
    if ('pledges' in user) {
      for (let pledge of user.pledges) {
        return pledge.campaign.state === 'schleswig-holstein';
      }
    }
    return false;
  });
};

const getUsersWithoutNewsletterFromSh = async () => {
  const users = await getAllUsers();
  return users.filter(user => {
    if ('pledges' in user) {
      for (let pledge of user.pledges) {
        if (pledge.campaign.state === 'schleswig-holstein') {
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
const getAllUsers = async () => {
  const users = [];
  let result = await getUsers();
  //add elements to existing array
  users.push(...result.Items);
  while ('LastEvaluatedKey' in result) {
    console.log('another request to db', result.LastEvaluatedKey);
    result = await getUsers(result.LastEvaluatedKey);
    users.push(...result.Items);
  }
  return users;
};

const getUsers = (startKey = null) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }
  return ddb.scan(params).promise();
};

const getUser = id => {
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: id,
    },
  };

  return ddb.get(params).promise();
};

const isVerified = (user, unverifiedCognitoUsers) => {
  let verified = true;
  for (let cognitoUser of unverifiedCognitoUsers) {
    //sub is the only attribute
    if (user.cognitoId === cognitoUser.Attributes[0].Value) {
      verified = false;
    }
  }
  return verified;
};

module.exports = {
  getAllUnverifiedCognitoUsers,
  getAllUsers,
  getUsersFromSh,
  isVerified,
  getUsersWithoutNewsletterFromSh,
  getAllCognitoUsers,
  getUser,
};
