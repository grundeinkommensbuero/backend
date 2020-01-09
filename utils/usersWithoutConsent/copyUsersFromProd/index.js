const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const { getUsersFromState } = require('../../getUsers');

const tableNameNew = 'users-without-consent';
const tableNameProd = 'prod-users';
const userPoolId = 'eu-central-1_xx4VmPPdF';

const copyUsersFromProd = async () => {
  try {
    const users = await getUsersFromState('brandenburg');
    //only get users without newsletter consent
    const usersWithoutConsent = users.filter(
      user => 'newsletterConsent' in user && !user.newsletterConsent.value
    );

    console.log('users without consent', usersWithoutConsent.length);

    copied = 0;

    for (let user of usersWithoutConsent) {
      // Check if user already exists in new table
      const result = await getUserByMail(user.email);

      if (result.Count === 0) {
        await createUserInDynamo(user);

        copied++;
      } else {
        try {
          await deleteUserInCognito(user);
        } catch (error) {
          if (error.code === 'UserNotFoundException') {
            console.log('cannot delete user in cognito, does not exist');
          }
        }
        await deleteUserInDynamo(user);
        console.log('user already exists', user.email);
      }

      if (copied % 20 === 0) {
        console.log('Copied', copied);
      }
    }

    console.log('finished, copied', copied);
  } catch (error) {
    console.log(error);
  }
};

const createUserInDynamo = user => {
  const params = {
    TableName: tableNameNew,
    Item: user,
  };

  return ddb.put(params).promise();
};

const deleteUserInCognito = user => {
  console.log('deleting user in cognito');
  var params = {
    UserPoolId: userPoolId,
    Username: user.cognitoId, //Username is the id of cognito
  };
  return cognito.adminDeleteUser(params).promise();
};

const deleteUserInDynamo = user => {
  console.log('deleting user in dynamo');
  const params = {
    TableName: tableNameProd,
    Key: {
      cognitoId: user.cognitoId, //Username is the id of cognito
    },
  };
  return ddb.delete(params).promise();
};

const getUserByMail = async (email, startKey = null) => {
  const params = {
    TableName: tableNameNew,
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
    return getUserByMail(email, result.LastEvaluatedKey);
  } else {
    return result;
  }
};

copyUsersFromProd();
