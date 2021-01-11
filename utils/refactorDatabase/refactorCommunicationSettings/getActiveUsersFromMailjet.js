const fs = require('fs');
const parse = require('csv-parse');

const getActiveUsers = async () => {
  try {
    const users = await readCsv();
    console.log(users.length);
    console.log(users);

    console.log(users.filter(user => user.userId === ''));
  } catch (error) {
    console.log('Error', error);
  }
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
        if (count > 0 && row[3] === '1') {
          user = {
            userId: row[57],
            email: row[0],
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
