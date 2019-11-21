// import { CognitoIdentityServiceProvider } from "aws-sdk";
const AWS = require('aws-sdk');
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;
const userPoolId = process.env.POOL_ID;

exports.handler = async event => {
  try {
    //get all users, which did not give newsletter consent
    const usersWithoutConsent = await getUsersWithoutConsent();
    console.log('users total count', usersWithoutConsent.Count);

    //resend confirmation code
    let count = 0;
    console.log('user', usersWithoutConsent.Items[0]);
    for (let user of usersWithoutConsent.Items) {
      if (
        'newsletterConsent' in user &&
        user.newsletterConsent.value === false
      ) {
        count++;
        try {
          await deleteUserInCognito(user);
          await deleteUserInDynamo(user);
        } catch (error) {
          console.log('error deleting user', error);
          break;
        }
      }
    }
    console.log('users without consent count', count);
  } catch (error) {
    console.log('error', error);
  }
  return;
};

const getUsersWithoutConsent = () => {
  const params = {
    TableName: tableName,
    ProjectionExpression: 'cognitoId, newsletterConsent',
  };
  return ddb.scan(params).promise();
};

const deleteUserInCognito = user => {
  console.log('deleting user in cognito');
  var params = {
    UserPoolId: userPoolId,
    Username: user.cognitoId, //Username is the id of cognito
  };
  return CognitoIdentityServiceProvider.adminDeleteUser(params).promise();
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
