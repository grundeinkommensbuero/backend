// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
  config
);
const ddb = new AWS.DynamoDB.DocumentClient(config);
const { getAllUnverifiedCognitoUsers } = require('../getUsers');

const deleteUsers = async () => {
  try {
    //get all users, which are not verified from user pool
    const notVerifiedCognitoUsers = await getAllUnverifiedCognitoUsers();
    //filter users to check if the creation of the user was more than
    //x days ago
    const date = new Date();
    const tenDays = 10 * 24 * 60 * 60 * 1000;
    const filteredUsers = notVerifiedCognitoUsers.filter(
      user => date - user.UserCreateDate > tenDays
    );

    console.log(
      'not verified and it has been x days count:',
      filteredUsers.length
    );

    for (let user of filteredUsers) {
      try {
        const result = await getNewCognitoId(user);
        const newCognitoId = result.Items[0].cognitoId;

        console.log('old id', user.Username);
        console.log('new id', newCognitoId);

        await deleteUserInCognito(newCognitoId);
        await deleteUserInDynamo(newCognitoId);
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

const deleteUserInCognito = userId => {
  console.log('deleting user in cognito');
  var params = {
    UserPoolId: 'eu-central-1_xx4VmPPdF',
    Username: userId,
  };

  return CognitoIdentityServiceProvider.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = userId => {
  console.log('deleting user in dynamo');
  const params = {
    TableName: 'prod-users',
    Key: {
      cognitoId: userId,
    },
  };

  return ddb.delete(params).promise();
};

const getNewCognitoId = async (user, startKey = null) => {
  const email = user.Attributes[2].Value;

  const params = {
    TableName: 'prod-users',
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
    return getNewCognitoId(user, result.LastEvaluatedKey);
  } else {
    return result;
  }
};

deleteUsers();
