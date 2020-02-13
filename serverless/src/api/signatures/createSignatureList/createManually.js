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

const URL = 'https://xbge.de/qr/hh/?listId=';
const CAMPAIGN_CODE = 'hamburg-1';
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
    console.log('id already exists?', idExists);
  }

  const pdfBytes = await generatePdf(
    URL,
    pdfId,
    'SERIENBRIEF',
    'hamburg-1',
    user
  );

  await createSignatureList(pdfId, timestamp, '', campaign, userId);

  fs.writeFileSync(`./lists/list_hh_${user.name}.pdf`, pdfBytes);
};

processCsv = async () => {
  try {
    const users = await readCsv();

    for (let user of users) {
      // Get userId of user
      const result = await getUserByMail(user.email);

      if (result.Count === 0) {
        console.log('no user found with that email', user.email);
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
          if (row[7] === '' && row[4] !== '') {
            user = {
              name: row[0],
              street: row[1],
              zipCode: row[2],
              city: row[3],
              email: row[4],
            };
          }

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

processCsv();
