const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const { getAllUsers } = require('../shared/users/getUsers');
const CONFIG = require('../config');

const removeEmptyValues = async tableName => {
  try {
    const users = await getAllUsers(tableName);

    for (let user of users) {
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

  return ddb.update(params).promise();
};

removeEmptyValues(CONFIG.PROD_TABLE_NAME);
