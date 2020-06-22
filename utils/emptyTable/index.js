const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = 'prod-signatures';
const { getSignatureLists } = require('../shared/signatures');

const emptyTable = async () => {
  try {
    const signatureLists = await getSignatureLists(tableName);

    for (const list of signatureLists) {
      await removeSignatureList(list.id);
      console.log('removed list', list.id);
    }
  } catch (error) {
    console.log('error', error);
  }
};

const removeSignatureList = id => {
  const params = {
    TableName: tableName,
    Key: {
      id,
    },
  };

  return ddb.delete(params).promise();
};

emptyTable().then(() => {
  console.log('finish');
  process.exit();
});
