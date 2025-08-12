const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const json = require('../../analyseData/recentMunicipalityData/output/municipalities-frontend.json');
const Bottleneck = require('bottleneck');
const CONFIG = require('../../config');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 4 });

const addMunicipalities = async () => {
  const errors = [];
  for (const municipality of json) {
    try {
      await limiter.schedule(async () => {
        await createMunicipality(municipality);
        console.log('Added municipality', municipality.ags);
      });
    } catch (error) {
      errors.push(error);
    }
  }

  console.log('errors', errors);
};

const createMunicipality = ({ ags, name, population, slug }) => {
  const params = {
    TableName: CONFIG.PROD_MUNICIPALITIES_TABLE_NAME,
    Item: {
      ags,
      name,
      population,
      slug,
    },
  };

  return ddb.put(params).promise();
  return ddb.put(params);
};

addMunicipalities();
