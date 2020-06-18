const fs = require('fs');
const {
  generateRandomId,
  constructCampaignId,
} = require('../../../shared/utils');
const { checkIfIdExists } = require('../../../shared/signatures');
const { getUserByMail } = require('../../../shared/users');
const { createSignatureList } = require('./');
const parse = require('csv-parse');
const generatePdfLetter = require('./createPDFLetter');

const MAPPING = {
  'hamburg-1': {
    URL: 'https://xbge.de/qr/hh/?listId=',
    SHORT: 'hh',
    COUNT_INDEX: 14,
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
};

const PATH = './Ergebnisse Briefaktion.csv';

const createListManually = async (userId, user) => {
  // we only want the current day (YYYY-MM-DD), then it is also easier to filter
  const timestamp = new Date().toISOString().substring(0, 10);

  const lists = [];
  let isDuplex = false;

  if (user.countB > 0) {
    lists.push(await constructListConfig('berlin-1', user.countB));
  }

  if (user.countBB > 0) {
    lists.push(await constructListConfig('brandenburg-1', user.countBB));
    isDuplex = true;
  }

  if (user.countHH > 0) {
    lists.push(await constructListConfig('hamburg-1', user.countHH));
  }

  if (user.countSH > 0) {
    lists.push(await constructListConfig('schleswig-holstein-1', user.countSH));
  }

  const mailMissing =
    user.email === 'postbrief-april-ohne-mail@expedition-grundeinkommen.de';

  const pdfBytes = await generatePdfLetter({
    lists,
    address: user.address,
    needsMailMissingAddition: mailMissing,
  });

  for (const list of lists) {
    await createSignatureList(
      list.code,
      timestamp,
      undefined,
      constructCampaignId(list.campaignCode),
      true,
      mailMissing,
      userId
    );
  }

  // Remove "/" from names for saving to file
  user.address.name = user.address.name.replace('/', '');

  fs.writeFileSync(
    `./lists/${isDuplex ? 'duplex' : 'simplex'}/${
      user.needsEnvelope ? 'envelope' : 'no-envelope'
    }/list_${user.address.name}.pdf`,
    pdfBytes
  );
};

const constructListConfig = async (campaignCode, count) => {
  // because the id is quite small we need to check if the newly created one already exists (unlikely)
  let idExists = true;
  let pdfId;

  while (idExists) {
    pdfId = generateRandomId(7);
    idExists = await checkIfIdExists(pdfId);
  }

  return {
    code: pdfId,
    campaignCode,
    listCount: count,
  };
};

const processCsv = async () => {
  try {
    const users = await readCsv();
    console.log('users length', users.length);
    for (const user of users) {
      // Get userId of user
      const result = await getUserByMail(user.email);

      if (result.Count === 0) {
        throw new Error(`no user found with that email ${user.email}`);
      } else {
        const userId = result.Items[0].cognitoId;

        // Create signature list
        await createListManually(userId, user);
      }
    }
  } catch (error) {
    console.log('error', error);
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

processCsv();
