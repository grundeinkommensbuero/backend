const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const pinpoint = new AWS.Pinpoint(config);

const { getAllCognitoUsers, getUser } = require('../shared/users/getUsers');
const {
  createUserInCognito,
  createUserInDynamo,
} = require('../shared/users/createUsers');

const Bottleneck = require('bottleneck');
const limiter = new Bottleneck({ minTime: 200, maxConcurrent: 1 });
const pinpointProjectId = '83c543b1094c4a91bf31731cd3f2f005';

const CONFIG = require('../config');
const tableName = CONFIG.PROD_TABLE_NAME;
const userPoolId = CONFIG.PROD_USER_POOL_ID;

// Copies cognito users and the dynamo data to new
// user pool and table
const copyData = async () => {
  try {
    console.log('fetching cognito users...');
    const cognitoUsers = await getAllCognitoUsers(userPoolId);

    console.log('fetched cognito users');

    let copied = 0;
    for (let cognitoUser of cognitoUsers) {
      await limiter.schedule(async () => {
        const oldId = cognitoUser.Username;
        try {
          if (cognitoUser.UserStatus === 'CONFIRMED') {
            const created = await createUserInCognito(
              userPoolId,
              cognitoUser.Attributes[2].Value
            );
            const newId = created.User.Username;

            console.log('old id', oldId);
            console.log('new id', newId);

            await confirmUser(userPoolId, newId);

            //get old dynamo entry
            const dynamoUser = await getUser(tableName, oldId);

            await createUserInDynamo(tableName, newId, dynamoUser.Item);

            const signatureLists = await getSignatureListsByUser(oldId);

            for (let list of signatureLists) {
              await changeUserInList(list.id, newId);
            }

            //delete old pinpoint entry
            await deleteEndpoint(oldId);

            copied++;
            if (copied % 20 === 0) {
              console.log('Copied', copied);
            }
          }
        } catch (error) {
          if (error.code === 'UsernameExistsException') {
            console.log('User already exists', oldId);
          } else {
            console.log('error', error);
          }
        }
      });
    }

    console.log('finished, copied ', copied);
  } catch (error) {
    console.log('error', error);
  }
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

copyData().then(() => {
  console.log('finished');
  process.exit();
});
