const { DEV_VOUCHERS_TABLE_NAME } = require('../../config');
const AWS = require('aws-sdk');
const Bottleneck = require('bottleneck');
const uuid = require('uuid/v4');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const crypto = require('crypto');

const secretKey = 'fUjXn2r5u7x!A%D*G-KaPdSgVkYp3s6v';

const encrypt = data => {
  const cipher = crypto.createCipheriv('AES-256-ECB', secretKey, null);
  let encrypted = cipher.update(data, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  console.log('enc', encrypted);
  return encrypted;
};

const decrypt = data => {
  const decipheriv = crypto.createDecipheriv('AES-256-ECB', secretKey, null);
  let decryptediv = decipheriv.update(data, 'base64', 'utf8');
  decryptediv += decipheriv.final('utf8');
  return decryptediv;
};

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 4 });

const safeAddresses = [uuid(), uuid(), uuid(), uuid()];

const fillDatabase = async () => {
  for (let i = 0; i < 300; i++) {
    await limiter.schedule(async () => {
      await createVoucher(
        {
          name: 'Goodbuy',
          id: 'goodbuy',
          logoUrl:
            'https://cdn.shopify.com/s/files/1/0260/0819/1060/files/LOGO_GOOD_BUY_Farbe_rgb_Unterzeile_540x.png?v=1654701435',
          shopUrl: 'https://www.goodbuy.eu/',
        },
        getAmount(i),
        getPurchaseInfo(i)
      );

      console.log('Created', i);
    });
  }
};

const getAmount = i => {
  if (i < 100) {
    return 10;
  } else if (i < 200) {
    return 15;
  }
  return 25;
};

const getPurchaseInfo = i => {
  if (i > 2500) {
    return {
      safeAddress: getSafeAddress(i),
      timestamp: createRandomDate().toISOString(),
      transactionId: uuid(),
    };
  }

  return null;
};

const getSafeAddress = i => {
  if (i < 2600) {
    return safeAddresses[0];
  } else if (i < 2700) {
    return safeAddresses[1];
  } else if (i < 2800) {
    return safeAddresses[2];
  } else if (i < 2900) {
    return safeAddresses[3];
  }

  return uuid();
};

const createVoucher = (provider, amount, sold) => {
  const params = {
    TableName: DEV_VOUCHERS_TABLE_NAME,
    Item: {
      id: uuid(),
      provider,
      amount,
      code: encrypt('Encrypt-Me :-)'),
    },
  };

  if (sold) {
    params.Item.soldTo = sold.safeAddress;
    params.Item.soldAt = sold.timestamp;
    params.Item.transactionId = sold.transactionId;
  }

  return ddb.put(params).promise();
};

const createRandomDate = () => {
  const date = new Date();
  const pastDate = new Date();

  pastDate.setDate(date.getDate() - 4);

  const randomDate = new Date(
    pastDate.getTime() +
      Math.floor(Math.random() * (date.getTime() - pastDate.getTime())) +
      1
  );

  return randomDate;
};

fillDatabase();
