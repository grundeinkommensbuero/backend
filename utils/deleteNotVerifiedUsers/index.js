// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
  config
);
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = 'Users';
const userPoolId = 'eu-central-1_74vNy5Iw0';
const { getAllUnverifiedCognitoUsers } = require('../getUsers');

const deleteUsers = async () => {
  try {
    //get all users, which are not verified from user pool
    const notVerifiedCognitoUsers = await getAllUnverifiedCognitoUsers();
    //filter users to check if the creation of the user was more than
    //x days ago
    const date = new Date();
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    const filteredUsers = notVerifiedCognitoUsers.filter(
      user => date - user.UserCreateDate > twoDays
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
        break;
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

deleteUsers();
