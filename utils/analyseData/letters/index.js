const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const analyse = async () => {
  let receivedListCount = 0;

  const signatureLists = await getSignatureListsFromLetters('berlin-1');

  let receivedSignatureCount = 0;

  for (const list of signatureLists) {
    if ('received' in list) {
      for (const scan of list.received) {
        receivedSignatureCount += scan.count;
      }

      receivedListCount++;
    }
  }

  console.log('generated lists', signatureLists.length);
  console.log('received lists', receivedListCount);
  console.log('received signatures', receivedSignatureCount);
  console.log(
    'average for people who sent list',
    receivedSignatureCount / receivedListCount
  );

  console.log(
    'average for all',
    receivedSignatureCount / signatureLists.length
  );
};

// function to get signature lists which were created for letters
const getSignatureListsFromLetters = async (
  campaignCode = null,
  signatureLists = [],
  startKey = null
) => {
  let filter;
  const values = { ':manually': true };
  if (campaignCode) {
    filter = 'manually = :manually AND campaign.code = :campaignCode';
    values[':campaignCode'] = campaignCode;
  } else {
    filter = 'manually = :manually';
  }

  const params = {
    TableName: 'prod-signatures',
    FilterExpression: filter,
    ExpressionAttributeValues: values,
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getSignatureListsFromLetters(
      campaignCode,
      signatureLists,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return signatureLists;
};

analyse();
