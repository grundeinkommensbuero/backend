// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);

const deleteUserInCognito = (userPoolId, user) => {
  console.log('deleting user in cognito');
  var params = {
    UserPoolId: userPoolId,
    Username: user.cognitoId, //Username is the id of cognito
  };
  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = (tableName, user) => {
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
