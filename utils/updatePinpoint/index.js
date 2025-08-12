const fs = require('fs');
const { Pinpoint } = require('@aws-sdk/client-pinpoint');

const pinpoint = new Pinpoint({
  region: 'eu-central-1',
});
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const parse = require('csv-parse');
const CONFIG = require('../config');
const { getUserByMail } = require('./../shared/users/getUsers');

const paths = {
  'jetzt-erst-recht': './data/jetzt erst recht.csv',
  pausieren: './data/kampagne pausieren.csv',
  'schon-gespendet': './data/schon gespendet.csv',
  'kann-nicht-spenden': './data/kann nicht spenden.csv',
  'listen-per-post': './data/listen per post.csv',
};
const tableName = CONFIG.PROD_USERS_TABLE_NAME;

const updatePinpoint = async () => {
  try {
    const users = await readCsv('listen-per-post');
    console.log(users.length);
    for (const user of users) {
      const result = await getUserByMail(tableName, user.email);
      if (result.Count > 0) {
        const userId = result.Items[0].cognitoId;

        const params = {
          ApplicationId: projectId,
          EndpointId: `email-endpoint-${userId}`,
          EndpointRequest: {
            ChannelType: 'EMAIL',
            Attributes: {
              ListsViaMail: ['Ja'],
            },
          },
        };

        await pinpoint.updateEndpoint(params);
        console.log('success updating endpoint', userId);
      } else {
        console.log('user not found', user.email);
      }
    }
  } catch (error) {
    console.log('error while updating pinpoint', error);
  }
};

// reads and parses the csv file and returns a promise containing
// an array of the users
const readCsv = source => {
  return new Promise(resolve => {
    const users = [];
    const path = paths[source];
    let count = 0;
    fs.createReadStream(path)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        // leave out headers
        if (count > 0) {
          console.log('row', row);
          if (row[10] !== '' || row[13] !== '') {
            user = {
              email: row[10] !== '' ? row[10] : row[13],
            };
          }

          if (typeof user !== 'undefined') {
            users.push(user);
          }
        }

        count++;
      })
      .on('end', () => {
        console.log('finished parsing', source);
        resolve(users);
      });
  });
};

updatePinpoint();
