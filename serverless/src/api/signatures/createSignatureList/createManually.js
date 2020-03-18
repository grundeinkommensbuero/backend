const fs = require('fs');
const {
  generateRandomId,
  constructCampaignId,
} = require('../../../shared/utils');
const { checkIfIdExists } = require('../../../shared/signatures');
const { getUserByMail } = require('../../../shared/users');
const { createSignatureList } = require('./');
const parse = require('csv-parse');
const generatePdf = require('./createPDF');

const MAPPING = {
  'hamburg-1': {
    URL: 'https://xbge.de/qr/hh/?listId=',
    SHORT: 'hh',
    COUNT_INDEX: 12,
  },
  'schleswig-holstein-1': {
    URL: 'https://xbge.de/qr/sh/?listId=',
    SHORT: 'sh',
    COUNT_INDEX: 11,
  },
  'brandenburg-1': {
    URL: 'https://xbge.de/qr/bb/?listId=',
    SHORT: 'bb',
    COUNT_INDEX: 13,
  },
};

const CAMPAIGN_CODE = 'brandenburg-1';
const PATH = './Ergebnisse Briefaktion.csv';

const createListManually = async (userId, user) => {
  //we only want the current day (YYYY-MM-DD), then it is also easier to filter
  const timestamp = new Date().toISOString().substring(0, 10);

  const campaign = constructCampaignId(CAMPAIGN_CODE);
  //because the id is quite small we need to check if the newly created one already exists (unlikely)
  let idExists = true;
  let pdfId;

  while (idExists) {
    pdfId = generateRandomId(7);
    idExists = await checkIfIdExists(pdfId);
  }

  let pdfType;

  if (user.count <= 2) {
    pdfType = 'SERIENBRIEF2';
  } else if (user.count <= 5) {
    pdfType = 'SERIENBRIEF5';
  } else if (user.count <= 15) {
    pdfType = 'SERIENBRIEF15';
  } else {
    pdfType = 'SERIENBRIEF30';
  }

  console.log('pdf type', pdfType);

  const pdfBytes = await generatePdf(
    MAPPING[CAMPAIGN_CODE].URL,
    pdfId,
    pdfType,
    CAMPAIGN_CODE,
    user
  );

  await createSignatureList(
    pdfId,
    timestamp,
    undefined,
    campaign,
    true,
    userId
  );

  fs.writeFileSync(
    `./lists/list_${MAPPING[CAMPAIGN_CODE].SHORT}_${user.name}.pdf`,
    pdfBytes
  );
};

processCsv = async () => {
  try {
    const users = await readCsv();
    console.log('users length', users.length);
    for (let user of users) {
      // Get userId of user
      const result = await getUserByMail(user.email);

      if (result.Count === 0) {
        throw new Error(`no user found with that email ${user.email}`);
      } else {
        userId = result.Items[0].cognitoId;

        // Create signature list
        await createListManually(userId, user);
      }
    }
  } catch (error) {
    console.log('error', error);
  }
};

//reads and parses the csv file and returns a promise containing
//an array of the users
const readCsv = () => {
  return new Promise(resolve => {
    const users = [];
    let count = 0;

    fs.createReadStream(PATH)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        //leave out headers
        if (count > 0) {
          user = {
            name: row[4],
            street: row[5],
            zipCode: row[6].substr(0, row[6].indexOf(' ')),
            city: row[6].substr(row[6].indexOf(' ') + 1),
            email: row[10] === '' ? row[7] : row[10],
            count: parseInt(row[MAPPING[CAMPAIGN_CODE].COUNT_INDEX]),
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
