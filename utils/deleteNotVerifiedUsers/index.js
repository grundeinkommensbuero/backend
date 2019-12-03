// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require('aws-sdk');
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;
const userPoolId = process.env.POOL_ID;

exports.handler = async event => {
  try {
    //get all users, which are not verified from user pool
    const notVerifiedCognitoUsers = await getAllNotVerifiedCognitoUsers();
    //filter users to check if the creation of the user was more than
    //24 hours agp
    const date = new Date();
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    const filteredUsers = notVerifiedCognitoUsers.filter(
      user => date - user.UserCreateDate > fiveDays
    );
    console.log(
      'not verified and it has been a day count:',
      filteredUsers.length
    );

    //resend confirmation code
    for (let user of filteredUsers) {
      try {
        await deleteUserInCognito(user);
        await deleteUserInDynamo(user);
      } catch (error) {
        console.log('error deleting user', error);
      }
    }
  } catch (error) {
    console.log('error', error);
  }
  return;
};

const deleteUserInCognito = user => {
  console.log('deleting user in cognito');
  var params = {
    UserPoolId: userPoolId,
    Username: user.Username, //Username is the id of cognito
  };
  return CognitoIdentityServiceProvider.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = user => {
  console.log('deleting user in dynamo');
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: user.Username, //Username is the id of cognito
    },
  };
  return ddb.delete(params).promise();
};
