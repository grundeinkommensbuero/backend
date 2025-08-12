const {
  PROD_SIGNATURES_TABLE_NAME,
  DEV_SIGNATURES_TABLE_NAME,
} = require('../../config');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const Bottleneck = require('bottleneck');
const { getSignatureLists } = require('../../shared/signatures');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));

const limiter = new Bottleneck({ minTime: 200, maxConcurrent: 2 });

const run = async () => {
  // Get all signature lists
  const lists = await getSignatureLists(PROD_SIGNATURES_TABLE_NAME);
  let i = 0;

  for (const list of lists) {
    await limiter.schedule(async () => {
      if (list.pdfUrl && !list.pdfUrl.includes('xbge-prod-signature-lists')) {
        await updateList(list);
      }
    });

    console.log('Updated', i++);
  }
};

const updateList = ({ id, pdfUrl }) => {
  const params = {
    TableName: PROD_SIGNATURES_TABLE_NAME,
    Key: { id },
    UpdateExpression: 'SET pdfUrl = :url',
    ExpressionAttributeValues: {
      ':url': pdfUrl.replace('signature-lists', 'xbge-prod-signature-lists'),
    },
  };

  return ddb.update(params);
};

run();
