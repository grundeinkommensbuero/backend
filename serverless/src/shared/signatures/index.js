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

// Function to get the first list of the user
const getOneSignatureListOfUser = async (userId, startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  //call same function again, if there is no list found, but not
  //the whole db has been scanned
  if (result.Count === 0 && 'LastEvaluatedKey' in result) {
    return getOneSignatureListOfUser(userId, result.LastEvaluatedKey);
  } else {
    return result;
  }
};

module.exports = { getSignatureList, getOneSignatureListOfUser };
