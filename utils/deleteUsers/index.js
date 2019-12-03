// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = 'Users';
const userPoolId = 'eu-central-1_74vNy5Iw0';

const {
  getUsersFromSh,
  getAllUnverifiedCognitoUsers,
  isVerified,
  getUsersWithoutNewsletterFromSh,
} = require('../getUsers');

const deleteUnverifiedUsersFromSh = async () => {
  try {
    const usersFromSh = await getUsersFromSh();
    const unverifiedUsers = await getAllUnverifiedCognitoUsers();
    let count = 0;
    console.log('user', usersFromSh.length);
    for (let user of usersFromSh) {
      if (!isVerified(user, unverifiedUsers)) {
        count++;
        console.log('timestamp', user.email, user.createdAt);
        try {
          await deleteUserInCognito(user);
          await deleteUserInDynamo(user);
        } catch (error) {
          console.log('error deleting user', error);
          break;
        }
      }
    }
    console.log('unverified users from sh', count);
  } catch (error) {
    console.log('error', error);
  }
};

const deleteUsersWithoutNewsletterFromSh = async () => {
  try {
    //get all users, who did not give newsletter consent
    const users = await getUsersWithoutNewsletterFromSh();
    for (let user of users) {
      console.log('newsletter consent', user.newsletterConsent);
      await deleteUserInCognito(user);
      await deleteUserInDynamo(user);
    }
  } catch (error) {
    console.log('error', error);
  }
};

const deleteUserInCognito = user => {
  console.log('deleting user in cognito');
  var params = {
    UserPoolId: userPoolId,
    Username: user.cognitoId, //Username is the id of cognito
  };
  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = user => {
  console.log('deleting user in dynamo');
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: user.cognitoId, //Username is the id of cognito
    },
  };
  return ddb.delete(params).promise();
};

deleteUsersWithoutNewsletterFromSh();
