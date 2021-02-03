const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const municipalitiesTableName = process.env.MUNICIPALITIES_TABLE_NAME;
const userMunicipalityTableName = process.env.USER_MUNICIPALITY_TABLE_NAME;

const getMunicipality = ags => {
  const params = {
    TableName: municipalitiesTableName,
    Key: {
      ags,
    },
  };

  return ddb.get(params).promise();
};

const getAllUsersOfMunicipality = ags => {
  const params = {
    TableName: userMunicipalityTableName,
    IndexName: 'agsIndex',
    KeyConditionExpression: 'ags = :ags',
    ExpressionAttributeValues: { ':ags': ags },
  };

  return ddb.query(params).promise();
};

const getAllMunicipalities = async (municipalities = [], startKey = null) => {
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
    return getAllMunicipalities(municipalities, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return municipalities;
};

const getAllMunicipalitiesWithUsers = async (
  municipalities = [],
  startKey = null
) => {
  const params = {
    TableName: userMunicipalityTableName,
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
    return getAllMunicipalitiesWithUsers(
      municipalities,
      result.LastEvaluatedKey
    );
  }

  // otherwise return the array
  return municipalities;
};

// Update userMunicipality table to create the link between user and munic
const createUserMunicipalityLink = (ags, userId, population) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: userMunicipalityTableName,
    Item: {
      ags,
      userId,
      createdAt: timestamp,
      population,
    },
  };

  return ddb.put(params).promise();
};

const getUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: userMunicipalityTableName,
    Key: {
      ags,
      userId,
    },
  };

  return ddb.get(params).promise();
};

const getMunicipalitiesOfUser = userId => {
  const params = {
    TableName: userMunicipalityTableName,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  return ddb.query(params).promise();
};

module.exports = {
  getMunicipality,
  getAllMunicipalities,
  getAllMunicipalitiesWithUsers,
  getAllUsersOfMunicipality,
  createUserMunicipalityLink,
  getUserMunicipalityLink,
  getMunicipalitiesOfUser,
};
