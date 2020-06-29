// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);
const pinpoint = new AWS.Pinpoint({ region: 'eu-central-1' });
const pinpointProjectId = '83c543b1094c4a91bf31731cd3f2f005';

const deleteUserInCognito = (userPoolId, userId) => {
  console.log('deleting user in cognito');
  var params = {
    UserPoolId: userPoolId,
    Username: userId, //Username is the id of cognito
  };
  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = (tableName, userId) => {
  console.log('deleting user in dynamo');
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: userId, //Username is the id of cognito
    },
  };
  return ddb.delete(params).promise();
};

const deleteUserInPinpoint = userId => {
  var params = {
    ApplicationId: pinpointProjectId,
    EndpointId: `email-endpoint-${userId}`,
  };

  return pinpoint.deleteEndpoint(params).promise();
};

module.exports = {
  deleteUserInCognito,
  deleteUserInDynamo,
  deleteUserInPinpoint,
};
