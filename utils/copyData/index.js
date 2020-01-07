const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const pinpoint = new AWS.Pinpoint(config);

const { getAllCognitoUsers, getUser } = require('../getUsers');
const Bottleneck = require('bottleneck');
const limiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });
const randomBytes = require('crypto').randomBytes;
const pinpointProjectId = '83c543b1094c4a91bf31731cd3f2f005';

// Copies cognito users and the dynamo data to new
// user pool and table
const copyData = async () => {
  try {
    const cognitoUsers = await getAllCognitoUsers();
    console.log('fetched cognito users');

    let copied = 0;
    for (let cognitoUser of cognitoUsers) {
      await limiter.schedule(async () => {
        try {
          const oldId = cognitoUser.Username;
          const created = await createUserInCognito(cognitoUser);
          const newId = created.User.Username;

          await confirmUser(newId);

          //get old dynamo entry
          const dynamoUser = await getUser(oldId);

          createUserInDynamo(newId, dynamoUser.Item);

          const signatureLists = await getSignatureListsByUser(oldId);

          for (let list of signatureLists) {
            await changeUserInList(list.id, newId);
          }

          //delete old pinpoint entry
          deleteEndpoint(oldId);

          copied++;
          if (copied % 20 === 0) {
            console.log('Copied', copied);
          }
        } catch (error) {
          console.log('error', error);
        }
      });
    }
  } catch (error) {
    console.log('error', error);
  }
};

//Create a new cognito user in our user pool
const createUserInCognito = user => {
  params = {
    UserPoolId: 'eu-central-1_xx4VmPPdF',
    Username: user.Attributes[2].Value,
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
      {
        Name: 'email',
        Value: user.Attributes[2].Value,
      },
    ],
    MessageAction: 'SUPPRESS', //we don't want to send an "invitation mail"
  };
  return cognito.adminCreateUser(params).promise();
};

//confirm user by setting a random password
//(need to do it this way, because user is in state force_reset_password)
const confirmUser = userId => {
  const password = getRandomString(20);
  const setPasswordParams = {
    UserPoolId: 'eu-central-1_xx4VmPPdF',
    Username: userId,
    Password: password,
    Permanent: true,
  };
  //set fake password to confirm user
  return cognito.adminSetUserPassword(setPasswordParams).promise();
};

const createUserInDynamo = (userId, user) => {
  delete user.cognitoId;

  const params = {
    TableName: 'prod-users',
    Item: {
      cognitoId: userId,
      ...user,
    },
  };

  return ddb.put(params).promise();
};

//function to get signature lists for this particular user
const getSignatureListsByUser = async (
  userId,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: 'Signatures',
    FilterExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getSignatureLists(userId, signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

const changeUserInList = (listId, userId) => {
  console.log('change user id in list');

  const params = {
    TableName: 'prod-signatures',
    Key: { id: listId },
    UpdateExpression: 'SET userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };
  return ddb.update(params).promise();
};

const deleteEndpoint = async userId => {
  var params = {
    ApplicationId: pinpointProjectId,
    EndpointId: `email-endpoint-${userId}`,
  };

  return pinpoint.deleteEndpoint(params).promise();
};

// Generates a random string (e.g. for generating random password)
const getRandomString = length => {
  return randomBytes(length).toString('hex');
};

copyData().then(() => {
  console.log('finished');
  process.exit();
});
