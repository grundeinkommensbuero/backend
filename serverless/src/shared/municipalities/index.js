const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const municipalitiesTableName = process.env.MUNICIPALITIES_TABLE_NAME;

const getMunicipality = ags => {
  const params = {
    TableName: municipalitiesTableName,
    Key: {
      ags,
    },
  };

  return ddb.get(params).promise();
};

const getAllMunicipalites = async (municipalities = [], startKey = null) => {
  const params = {
    TableName: municipalitiesTableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  municipalities.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getAllMunicipalites(municipalities, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return municipalities;
};

module.exports = {
  getMunicipality,
  getAllMunicipalites,
};
