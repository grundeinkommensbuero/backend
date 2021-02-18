const AWS = require('aws-sdk');
const { getMunicipalityGoal } = require('../../shared/utils');

const ddb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const municipalitiesTableName = process.env.MUNICIPALITIES_TABLE_NAME;
const userMunicipalityTableName = process.env.USER_MUNICIPALITY_TABLE_NAME;
const bucket = 'xbge-municipalities-stats';
const stage = process.env.STAGE;

const getMunicipality = ags => {
  const params = {
    TableName: municipalitiesTableName,
    Key: {
      ags,
    },
  };

  return ddb.get(params).promise();
};

const getAllUsersOfMunicipality = async (ags, users = [], startKey = null) => {
  const params = {
    TableName: userMunicipalityTableName,
    IndexName: 'agsIndex',
    KeyConditionExpression: 'ags = :ags',
    ExpressionAttributeValues: { ':ags': ags },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.query(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if there are too many result, only needed
  // if there are a lot of results
  if ('LastEvaluatedKey' in result) {
    return getAllUsersOfMunicipality(ags, users, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return users;
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

const getMunicipalityStats = async (ags, population) => {
  const userResult = await getAllUsersOfMunicipality(ags);

  const signups = userResult.Count;

  const goal = getMunicipalityGoal(population);

  // compute percent to goal
  const percentToGoal = +((signups / goal) * 100).toFixed(1);

  return { goal, signups, percentToGoal };
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

// Gets json file from s3
const getStatsJson = fileName => {
  const params = {
    Bucket: bucket,
    Key: `${stage}/${fileName}`,
  };

  return s3.getObject(params).promise();
};

module.exports = {
  getMunicipality,
  getAllMunicipalities,
  getAllMunicipalitiesWithUsers,
  getAllUsersOfMunicipality,
  getMunicipalityStats,
  createUserMunicipalityLink,
  getUserMunicipalityLink,
  getMunicipalitiesOfUser,
  getStatsJson,
};
