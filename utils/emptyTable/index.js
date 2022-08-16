const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = 'dev-vouchers';

const emptyTable = async () => {
  try {
    const vouchers = await getVouchers();

    console.log('got vouchers', vouchers.length);

    for (const voucher of vouchers) {
      await removeVoucher(voucher.id);
      console.log('removed voucher', voucher.id);
    }
  } catch (error) {
    console.log('error', error);
  }
};

const removeVoucher = id => {
  const params = {
    TableName: tableName,
    Key: {
      id,
    },
  };

  return ddb.delete(params).promise();
};

const getVouchers = async (vouchers = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  vouchers.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getVouchers(vouchers, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return vouchers;
};

emptyTable().then(() => {
  console.log('finish');
  process.exit();
});
