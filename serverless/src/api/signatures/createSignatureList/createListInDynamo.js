const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));
const signaturesTableName =
  process.env.SIGNATURES_TABLE_NAME || 'prod-signatures';

// function to create new signature list
module.exports = (
  id,
  timestamp,
  url,
  campaign,
  manually,
  mailMissing,
  userId
) => {
  const params = {
    TableName: signaturesTableName,
    Item: {
      id,
      pdfUrl: url,
      downloads: 1,
      campaign,
      createdAt: timestamp,
      mailMissing,
      manually,
    },
  };

  // if the list is not supposed to be anonymous, append user id
  if (userId !== null) {
    params.Item.userId = userId;
  }

  return ddb.put(params);
};
