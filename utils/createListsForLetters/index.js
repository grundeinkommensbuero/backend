const { transformDate } = require('../shared/utils');
const fs = require('fs');
const parse = require('csv-parse');
const { createUser } = require('../migrateUsers');
const { getUserByMail } = require('../shared/users/getUsers');
const createListManually = require('../../serverless/src/shared/signatures/createPdf/createManually');
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

// eslint-disable-next-line no-unused-vars
const createListsForXbge = async () => {
  await createLists('xbge');
};

// eslint-disable-next-line no-unused-vars
const createListsForBBPlatfrom = async () => {
  await createLists('bb-platform');
};

const createLists = async platform => {
  try {
    const users =
      platform === 'bb-platform' ? await readBBPlatformCsv() : await readCsv();

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

// reads and parses the csv file and returns a promise containing
// an array of the users
const readBBPlatformCsv = () => {
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
              name: `${row[2]} ${row[3]}`,
              street: row[4],
              zipCode: row[6],
              city: row[7],
            },
            email: row[11] !== '' ? row[11] : row[8],
            zipCode: row[6],
            createdAt: new Date(transformDate(row[13])).toISOString(),
            source: 'typeform-bb-platform',
            needsEnvelope: row[1].startsWith('Ja'),
          };

          if (row[0].includes('Grundeinkommen')) {
            user.countDibb = 4;
            user.countVerkehrswende = 1;
            user.countKlimanotstand = 1;
          } else if (row[0].includes('Verkehrswende')) {
            user.countDibb = 1;
            user.countVerkehrswende = 4;
            user.countKlimanotstand = 1;
          } else if (row[0].includes('Klimanotstand')) {
            user.countDibb = 1;
            user.countVerkehrswende = 1;
            user.countKlimanotstand = 4;
          } else if (row[0].includes('5')) {
            user.countDibb = 5;
            user.countVerkehrswende = 5;
            user.countKlimanotstand = 5;
          } else {
            user.countDibb = 2;
            user.countVerkehrswende = 2;
            user.countKlimanotstand = 2;
          }

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

createListsForBBPlatfrom();
