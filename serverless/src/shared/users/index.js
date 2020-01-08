const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME;

const getUser = userId => {
  return ddb
    .get({
      TableName: tableName,
      Key: {
        cognitoId: userId,
      },
    })
    .promise();
};

const getUserByMail = async (email, startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  //call same function again, if there is no user found, but not
  //the whole db has been scanned
  if (result.Count === 0 && 'LastEvaluatedKey' in result) {
    console.log('call getUserByMail recursively');
    return getUserByMail(email, result.LastEvaluatedKey);
  } else {
    return result;
  }
};

module.exports = { getUser, getUserByMail };
