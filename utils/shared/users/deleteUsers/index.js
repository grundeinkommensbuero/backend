// import { CognitoIdentityServiceProvider } from "aws-sdk";


const { CognitoIdentityProvider } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { Pinpoint } = require('@aws-sdk/client-pinpoint');

const config = { region: 'eu-central-1' };
const cognito = new CognitoIdentityProvider(config);
const ddb = DynamoDBDocument.from(new DynamoDB(config));
const pinpoint = new Pinpoint({
  region: 'eu-central-1',
});
const pinpointProjectId = '83c543b1094c4a91bf31731cd3f2f005';

const deleteUserInCognito = (userPoolId, userId) => {
  console.log('deleting user in cognito');
  const params = {
    UserPoolId: userPoolId,
    Username: userId, // Username is the id of cognito
  };
  return cognito.adminDeleteUser(params);
};

const deleteUserInDynamo = (tableName, userId) => {
  console.log('deleting user in dynamo');
  const params = {
    TableName: tableName,
    Key: {
      cognitoId: userId, // Username is the id of cognito
    },
  };
  return ddb.delete(params);
};

const deleteUserInPinpoint = userId => {
  const params = {
    ApplicationId: pinpointProjectId,
    EndpointId: `email-endpoint-${userId}`,
  };

  return pinpoint.deleteEndpoint(params);
};

module.exports = {
  deleteUserInCognito,
  deleteUserInDynamo,
  deleteUserInPinpoint,
};
