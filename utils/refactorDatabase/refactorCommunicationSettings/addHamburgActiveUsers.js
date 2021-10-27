const fs = require('fs');
const parse = require('csv-parse');
const { PROD_USERS_TABLE_NAME } = require('../../config');
const { getUserByMail } = require('../../shared/users/getUsers');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const addActiveUsers = async () => {
  const users = await readCsv();

  console.log(users);

  for (const user of users) {
    const result = await getUserByMail(PROD_USERS_TABLE_NAME, user.email);

    if (result.Count !== 0) {
      await updateUser(result.Items[0]);
      console.log('Updated user', user.email);
    } else {
      console.log('User not found', user.email);
    }
  }
};

const updateUser = user => {
  const newsletters = user.customNewsletters;
  let hasHamburgNewsletter = false;

  const newNewsletterArray = newsletters.map(newsletter => {
    if (newsletter.name === 'Hamburg') {
      newsletter.extraInfo = true;
      hasHamburgNewsletter = true;
    }

    return newsletter;
  });

  if (!hasHamburgNewsletter) {
    console.log('Does not have Hamburg newsletter', user.email);
  }

  const params = {
    TableName: PROD_USERS_TABLE_NAME,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'SET customNewsletters = :customNewsletters',
    ExpressionAttributeValues: {
      ':customNewsletters': newNewsletterArray,
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

    fs.createReadStream('./hamburg_active_users.csv')
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        // leave out headers
        if (count > 0 && row[1] !== '') {
          user = {
            email: row[1],
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

addActiveUsers();
