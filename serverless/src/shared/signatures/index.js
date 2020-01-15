const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.SIGNATURES_TABLE_NAME;

// function to get a list by id
const getSignatureList = id => {
  const params = {
    TableName: tableName,
    Key: {
      id: id,
    },
  };
  return ddb.get(params).promise();
};

//function to get signature lists for this particular user
const getSignatureListsOfUser = async (
  userId,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getSignatureLists(userId, signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

// function to get all signature lists of a specific user, where there is a received
// or scannedByUser key
const getScannedSignatureListsOfUser = async (
  userId,
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression:
      '(attribute_exists(received) OR attribute_exists(scannedByUser)) AND userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getScannedSignatureListsOfUser(
      userId,
      signatureLists,
      result.LastEvaluatedKey
    );
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

//Checks, if the passed id already exists in the signatures table (returns true or false)
const checkIfIdExists = async id => {
  const params = {
    TableName: tableName,
    Key: {
      id: id,
    },
    ProjectionExpression: 'id',
  };
  const result = await ddb.get(params).promise();
  //if there is Item in result, there was an entry found
  return 'Item' in result && typeof result.Item !== 'undefined';
};

module.exports = {
  getSignatureList,
  getSignatureListsOfUser,
  getScannedSignatureListsOfUser,
  checkIfIdExists,
};
