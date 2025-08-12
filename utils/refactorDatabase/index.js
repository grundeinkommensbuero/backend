const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));
const { getAllUsers } = require('../shared/users/getUsers');
const CONFIG = require('../config');

// eslint-disable-next-line no-unused-vars
const removeEmptyValues = async tableName => {
  try {
    const users = await getAllUsers(tableName);

    for (const user of users) {
      if (
        ('zipCode' in user && user.zipCode === 'empty') ||
        ('username' in user && user.username === 'empty') ||
        ('referral' in user && user.referral === 'empty')
      ) {
        console.log('removing values...', user.email);
        await removeEmptyValuesFromUser(tableName, user);
      }
    }
  } catch (error) {
    console.log('Error', error);
  }
};

const removeEmptyValuesFromUser = async (tableName, user) => {
  let updateExpression = `REMOVE ${
    'zipCode' in user && user.zipCode === 'empty' ? 'zipCode,' : ''
  }${'username' in user && user.username === 'empty' ? 'username,' : ''}${
    'referral' in user && user.referral === 'empty' ? 'referral,' : ''
  }`;

  // Remove last char
  updateExpression = updateExpression.slice(0, -1);

  const params = {
    TableName: tableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: updateExpression,
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params);
};

const moveScansToUsers = async (usersTableName, signaturesTableName) => {
  try {
    const signatureLists = await getScannedSignatureLists(signaturesTableName);

    for (const list of signatureLists) {
      if (list.userId !== 'anonymous') {
        if ('scannedByUser' in list) {
          const scans = list.scannedByUser.map(scan => {
            return {
              count: parseInt(scan.count, 10),
              timestamp: scan.timestamp,
              campaign: list.campaign,
              listId: list.id,
            };
          });

          console.log('updating user', list.userId);
          await saveScansInUser(usersTableName, list.userId, scans);
        }
      }
    }
  } catch (error) {
    console.log('error', error);
  }
};

const saveScansInUser = async (usersTableName, userId, scans) => {
  const params = {
    TableName: usersTableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      'SET scannedLists = list_append(if_not_exists(scannedLists, :emptyList), :scans)',
    ExpressionAttributeValues: { ':scans': scans, ':emptyList': [] },
  };

  return ddb.update(params);
};

const getScannedSignatureLists = async (
  signaturesTableName,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression:
      'attribute_exists(received) OR attribute_exists(scannedByUser)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params);
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getScannedSignatureLists(
      signaturesTableName,
      signatureLists,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return signatureLists;
};

moveScansToUsers(
  CONFIG.PROD_USERS_TABLE_NAME,
  CONFIG.PROD_SIGNATURES_TABLE_NAME
);
