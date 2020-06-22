const { getAllCognitoUsers } = require('../../shared/users/getUsers');
const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');
const { PROD_USERS_TABLE_NAME, PROD_USER_POOL_ID } = require('../../config');

const config = { region: 'eu-central-1' };
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const ddb = new AWS.DynamoDB.DocumentClient(config);

const limiter = new Bottleneck({ minTime: 200, maxConcurrent: 2 });

const lowercaseEmailsInCognito = async (userPoolId, tableName) => {
  try {
    console.log('about to get all cognito users');
    const cognitoUsers = await getAllCognitoUsers(userPoolId);
    console.log('got all cognito users');

    const changedEmails = [];
    const duplicates = [];
    let count = 0;
    for (const cognitoUser of cognitoUsers) {
      await limiter.schedule(async () => {
        const email = cognitoUser.Attributes[2].Value;
        const lowercaseEmail = email.toLowerCase();

        // If the lowercased email is different we update the user
        if (lowercaseEmail !== email) {
          if (changedEmails.includes(lowercaseEmail)) {
            duplicates.push(lowercaseEmail);
          } else {
            changedEmails.push(lowercaseEmail);
            console.log('about to change email', lowercaseEmail);

            try {
              await updateCognitoUser(
                userPoolId,
                cognitoUser.Username,
                lowercaseEmail
              );

              await updateDynamoUser(
                tableName,
                cognitoUser.Username,
                lowercaseEmail
              );
            } catch (error) {
              if (error.code === 'AliasExistsException') {
                console.log('email could not be changed, already exists');
                duplicates.push(lowercaseEmail);
              } else {
                throw error;
              }
            }
          }
        }
      });

      process.stdout.write(`processed ${count} users\r`);
      count++;
    }

    console.log('Changed Emails', changedEmails);

    console.log('Duplicates', duplicates);

    console.log('Changed Emails length', changedEmails.length);
    console.log('Duplicates length', duplicates.length);
  } catch (error) {
    console.log('Error while lowercasing cognito', error);
  }
};

const updateCognitoUser = (userPoolId, userId, email) => {
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
    ],
  };

  return cognito.adminUpdateUserAttributes(params).promise();
};

const updateDynamoUser = (tableName, userId, email) => {
  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET email = :email',
    ExpressionAttributeValues: { ':email': email },
  };
  return ddb.update(params).promise();
};

lowercaseEmailsInCognito(PROD_USER_POOL_ID, PROD_USERS_TABLE_NAME);
