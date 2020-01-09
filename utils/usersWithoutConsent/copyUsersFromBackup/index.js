const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const tableNameNew = 'users-without-consent';

const copyUsersFromBackup = async tableNameBackup => {
  try {
    const result = await getUsersFromBackup(tableNameBackup);
    const backupUsers = result.Items;
    //only get users without newsletter consent
    const backupUsersWithoutConsent = backupUsers.filter(
      user => 'newsletterConsent' in user && !user.newsletterConsent.value
    );

    copied = 0;
    for (let user of backupUsersWithoutConsent) {
      await createUserInDynamo(user);

      copied++;
      if (copied % 20 === 0) {
        console.log('Copied', copied);
      }
    }

    console.log('finished, copied', copied);
  } catch (error) {
    console.log(error);
  }
};

const getUsersFromBackup = tableName => {
  const params = {
    TableName: tableName,
  };
  return ddb.scan(params).promise();
};

const createUserInDynamo = user => {
  const params = {
    TableName: tableNameNew,
    Item: user,
  };

  return ddb.put(params).promise();
};

copyUsersFromBackup('UsersWithoutConsent-02-12');
