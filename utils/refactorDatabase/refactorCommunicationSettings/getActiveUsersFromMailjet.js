const fs = require('fs');
const parse = require('csv-parse');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const { PROD_USERS_TABLE_NAME } = require('../../config');
const { getUser } = require('../../shared/users/getUsers');

const getActiveUsers = async () => {
  try {
    const users = await readCsv();
    console.log(users);

    for (const user of users) {
      const result = await getUser(PROD_USERS_TABLE_NAME, user.userId);

      if ('Item' in result) {
        if ('customNewsletters' in result.Item) {
          if (result.Item.customNewsletters.length > 1) {
            console.log('newsletters array > 1', user.userId);
          } else if (result.Item.customNewsletters.length === 0) {
            console.log('newsletters array = 0', user.userId);
          } else {
            await updateUser(result.Item);
            console.log('Updated', user.userId);
          }
        } else {
          console.log('No custom newsletters array', user.userId);
        }
      } else {
        console.log('No user found', user.userId);
      }
    }
  } catch (error) {
    console.log('Error', error);
  }
};

const updateUser = user => {
  const newsletters = user.customNewsletters;

  newsletters[0].extraInfo = true;

  const params = {
    TableName: PROD_USERS_TABLE_NAME,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'SET customNewsletters =  :customNewsletters',
    ExpressionAttributeValues: {
      ':customNewsletters': newsletters,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

// reads and parses the csv file and returns a promise containing
// an array of the users
const readCsv = () => {
  return new Promise(resolve => {
    const users = [];
    let count = 0;

    fs.createReadStream('./mailjet_users.csv')
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        // leave out headers
        if (count > 0 && row[3] === '1' && row[61] === 'f' && row[57] !== '') {
          user = {
            userId: row[57],
          };

          if (typeof user !== 'undefined') {
            users.push(user);
          }
        }

        count++;
      })
      .on('end', () => {
        console.log('finished parsing');
        resolve(users);
      });
  });
};

getActiveUsers();
