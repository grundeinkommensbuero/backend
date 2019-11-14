const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const tableName = process.env.TABLE_NAME;

exports.handler = async event => {
  try {
    const users = await getAllUsers();
    const notVerifiedCognitoUsers = await getAllNotVerifiedCognitoUsers();
    console.log('not verified count', notVerifiedCognitoUsers.length);
    //go through users to sum up pledged signatures
    let signatureCount = 0;
    for (let user of users.Items) {
      //check if the user is verified
      let verified = isVerified(user, notVerifiedCognitoUsers);

      //if user is not verified we do not need to count the signatures
      if (verified) {
        let count = user['pledge-schleswig-holstein-1'].signatureCount;
        if (typeof count !== 'undefined') {
          //signature count might have been saved as string
          if (typeof count !== 'number') {
            count = parseInt(count, 10);
          }
          //only add the number, if it was parsed correctly
          if (isNaN(count) === false) {
            signatureCount += count;
          } else {
            console.log('not number', count);
          }
        }
      }
    }
    const average =
      signatureCount / (users.Count - notVerifiedCognitoUsers.length);
    const notVerifiedPercentage =
      (notVerifiedCognitoUsers.length / users.Count) * 100;
    console.log(
      `There were ${signatureCount} pledged signatures of ${users.Count} verified users, 
      which means that the average pledge is ${average}`
    );
    console.log(
      `${notVerifiedCognitoUsers.length} users are not verified, 
      which means that ${notVerifiedPercentage}% of users are not verified`
    );
    return signatureCount;
  } catch (error) {
    console.log('error while fetching users from db', error);
  }
};

const getAllUsers = () => {
  const params = {
    TableName: tableName,
  };
  return ddb.scan(params).promise();
};

const getAllNotVerifiedCognitoUsers = async () => {
  let notVerifiedCognitoUsers = [];
  let data = await getNotVerifiedCognitoUsers(null);
  //add elements of user array
  notVerifiedCognitoUsers.push(...data.Users);
  while (data.PaginationToken) {
    data = await getNotVerifiedCognitoUsers(data.PaginationToken);
    //add elements of user array
    notVerifiedCognitoUsers.push(...data.Users);
  }
  return notVerifiedCognitoUsers;
};

//This functions only fetches the maximum of 60 users
const getNotVerifiedCognitoUsers = paginationToken => {
  const params = {
    UserPoolId: 'eu-central-1_74vNy5Iw0',
    Filter: 'cognito:user_status = "UNCONFIRMED"',
    AttributesToGet: [
      'sub', //sub is the id
    ],
    PaginationToken: paginationToken,
  };
  //get all users, which are not verified from user pool
  return CognitoIdentityServiceProvider.listUsers(params).promise();
};

const isVerified = (user, notVerifiedCognitoUsers) => {
  let verified = true;
  for (let cognitoUser of notVerifiedCognitoUsers) {
    //sub is the only attribute
    if (user.cognitoId === cognitoUser.Attributes[0].Value) {
      verified = false;
    }
  }
  return verified;
};
