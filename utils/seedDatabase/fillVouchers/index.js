const { PROD_VOUCHERS_TABLE_NAME, VOUCHER_API_KEY } = require('../../config');
const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');
const uuid = require('uuid/v4');
const fs = require('fs');
const parse = require('csv-parse');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const crypto = require('crypto');

const SECRET_KEY = VOUCHER_API_KEY;

const PATH = './data/sirplus/gift_cards_50.csv';

const PROVIDERS = {
  taste: {
    name: 'Geschmack braucht keinen Namen',
    id: 'taste',
    logoUrl:
      'https://directus.volksentscheid-grundeinkommen.de/assets/c094224b-a5d0-4911-899d-67019e7b2a0a',
    shopUrl: 'https://geschmack.org',
  },
  goodbuy: {
    name: 'Goodbuy',
    id: 'goodbuy',
    logoUrl:
      'https://directus.volksentscheid-grundeinkommen.de/assets/819423cf-2fd0-407e-bc5d-a06105287ba0',
    shopUrl: 'https://www.goodbuy.eu',
  },
  sirplus: {
    name: 'Sirplus',
    id: 'sirplus',
    logoUrl:
      'https://directus.volksentscheid-grundeinkommen.de/assets/c25e6f9c-46a3-4ba8-9100-7571ee5e0eb7',
    shopUrl: 'https://sirplus.de',
  },
};

const encrypt = data => {
  const cipher = crypto.createCipheriv('AES-256-ECB', SECRET_KEY, null);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  console.log('enc', data, encrypted);
  return encrypted;
};

const decrypt = data => {
  const decipheriv = crypto.createDecipheriv('AES-256-ECB', SECRET_KEY, null);
  let decryptediv = decipheriv.update(data, 'base64', 'utf8');
  decryptediv += decipheriv.final('utf8');
  return decryptediv;
};

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 4 });

const fillDatabase = async () => {
  const vouchers = await readCsv();

  for (const voucher of vouchers) {
    await limiter.schedule(async () => {
      await createVoucher(PROVIDERS.sirplus, 50, voucher);
    });
  }
};

const createVoucher = (provider, amount, code) => {
  const params = {
    TableName: PROD_VOUCHERS_TABLE_NAME,
    Item: {
      id: uuid(),
      provider,
      amount,
      code: encrypt(code),
    },
  };

  console.log(params.Item);
  return ddb.put(params).promise();
};

const readCsv = () => {
  return new Promise(resolve => {
    const codes = [];
    let count = 0;

    fs.createReadStream(PATH)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let code;
        // leave out headers
        if (count > 0) {
          code = row[1];

          codes.push(code);
        }

        count++;
      })
      .on('end', () => {
        console.log('finished parsing');
        resolve(codes);
      });
  });
};

fillDatabase();

// console.log(decrypt('MATExZmXUVfVsJ66xU0ZEA=='));
