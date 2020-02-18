const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = 'prod-signatures';

const emptyTable = async () => {
  try {
    const signatureLists = await getSignatureLists();

    for (let list of signatureLists) {
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
      id: id,
    },
  };

  return ddb.delete(params).promise();
};

//function to get all signature lists
const getSignatureLists = async (signatureLists = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getSignatureLists(signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

emptyTable().then(() => {
  console.log('finish');
  process.exit();
});
