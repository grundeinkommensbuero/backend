const { transformDate } = require('../shared/utils');
const fs = require('fs');
const parse = require('csv-parse');
const { createUser } = require('../migrateUsers');
const { getUserByMail } = require('../shared/users/getUsers');
const createListManually = require('../../serverless/src/api/signatures/createSignatureList/createManually');
const { PROD_USERS_TABLE_NAME } = require('../config');

const MAPPING = {
  'hamburg-1': {
    URL: 'https://xbge.de/qr/hh/?listId=',
    SHORT: 'hh',
    COUNT_INDEX: 16,
  },
  'schleswig-holstein-1': {
    URL: 'https://xbge.de/qr/sh/?listId=',
    SHORT: 'sh',
    COUNT_INDEX: 13,
  },
  'brandenburg-1': {
    URL: 'https://xbge.de/qr/bb/?listId=',
    SHORT: 'bb',
    COUNT_INDEX: 15,
  },
  'berlin-1': {
    URL: 'https://xbge.de/qr/b/?listId=',
    SHORT: 'b',
    COUNT_INDEX: 17,
  },
  'bremen-1': {
    URL: 'https://xbge.de/qr/hb/?listId=',
    SHORT: 'hb',
    COUNT_INDEX: 14,
  },
};

const PATH = './Ergebnisse Briefaktion.csv';

const createLists = async () => {
  try {
    const users = await readCsv();

    for (const user of users) {
      try {
        // console.log('user', user);
        await createUser(user);
      } catch (error) {
        if (error.code === 'UsernameExistsException') {
          console.log('user exists', user.email);
        } else {
          console.log('different error', error);
        }
      }

      // Get userId of user
      const result = await getUserByMail(PROD_USERS_TABLE_NAME, user.email);

      if (result.Count === 0) {
        throw new Error(`no user found with that email ${user.email}`);
      } else {
        const userId = result.Items[0].cognitoId;

        // Create signature list
        await createListManually(userId, user);
      }
    }
  } catch (error) {
    console.log('error while creating letter lists', error);
  }
};

// reads and parses the csv file and returns a promise containing
// an array of the users
const readCsv = () => {
  return new Promise(resolve => {
    const users = [];
    let count = 0;

    fs.createReadStream(PATH)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        // leave out headers
        if (count > 0) {
          user = {
            address: {
              name: `${row[4]} ${row[5]}`,
              street: row[6],
              zipCode: row[7],
              city: row[8],
            },
            email: row[12] !== '' ? row[12] : row[9],
            zipCode: row[7],
            createdAt: new Date(transformDate(row[20])).toISOString(),
            source: 'typeform-bge',
            countB:
              row[MAPPING['berlin-1'].COUNT_INDEX] !== ''
                ? parseInt(row[MAPPING['berlin-1'].COUNT_INDEX], 10)
                : 0,
            countSH:
              row[MAPPING['schleswig-holstein-1'].COUNT_INDEX] !== ''
                ? parseInt(row[MAPPING['schleswig-holstein-1'].COUNT_INDEX], 10)
                : 0,
            countBB:
              row[MAPPING['brandenburg-1'].COUNT_INDEX] !== ''
                ? parseInt(row[MAPPING['brandenburg-1'].COUNT_INDEX], 10)
                : 0,
            countHH:
              row[MAPPING['hamburg-1'].COUNT_INDEX] !== ''
                ? parseInt(row[MAPPING['hamburg-1'].COUNT_INDEX], 10)
                : 0,
            countHB:
              row[MAPPING['bremen-1'].COUNT_INDEX] !== ''
                ? parseInt(row[MAPPING['bremen-1'].COUNT_INDEX], 10)
                : 0,
            needsEnvelope: row[19].startsWith('Ja'),
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

createLists();
