const AWS = require('aws-sdk');
const json = require('../../analyseData/mergeGeospatialData/output/places.json');
const Bottleneck = require('bottleneck');
const CONFIG = require('../../config');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 4 });

const addMunicipalities = async () => {
  for (const municipality of json) {
    try {
      await limiter.schedule(async () => {
        await createMunicipality(municipality);
        console.log('Added municipality', municipality.ags);
      });
    } catch (error) {
      console.log('Error', error);
    }
  }
};

const createMunicipality = ({ ags, name, population }) => {
  const params = {
    TableName: CONFIG.DEV_MUNICIPALITIES_TABLE_NAME,
    Item: {
      ags,
      name,
      population,
    },
  };

  return ddb.put(params).promise();
};

addMunicipalities();
