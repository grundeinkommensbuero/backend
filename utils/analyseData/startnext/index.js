const { PROD_USERS_TABLE_NAME } = require('../../config');
const { getUserByMail } = require('../../shared/users/getUsers');
const PATH = './startnext users.csv';
const fs = require('fs');
const parse = require('csv-parse');

const checkDuplicates = async () => {
  const users = await readCsv();

  console.log('startnext users length', users.length);
  const withoutDuplicates = [];

  for (let user of users) {
    const result = await getUserByMail(PROD_USERS_TABLE_NAME, user.email);

    if (result.Count === 0) {
      withoutDuplicates.push(user);
    }
  }

  console.log('without duplicates length', withoutDuplicates.length);
  generateCsv(withoutDuplicates);
};

//reads and parses the csv file and returns a promise containing
//an array of the users
const readCsv = () => {
  return new Promise(resolve => {
    const users = [];
    let count = 0;

    fs.createReadStream(PATH)
      .pipe(parse({ delimiter: ';' }))
      .on('data', row => {
        let user;
        //leave out headers
        if (count > 0) {
          user = {
            email: row[4],
            username: row[2].split(' ')[0],
          };

          if (typeof user !== 'undefined' && user.email !== '') {
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

//Parses the users array to a string and saves it as csv file
const generateCsv = users => {
  let dataString = 'ChannelType,Address,Demographic.Make\n';
  for (let user of users) {
    //for now we just expect a user to only have one pledge
    dataString += `EMAIL,${user.email},${user.username}\n`;
  }
  fs.writeFileSync(`without duplicates.csv`, dataString);
};

checkDuplicates();
