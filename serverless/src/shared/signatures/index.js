const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.SIGNATURES_TABLE_NAME;

//function to get a list by id
const getSignatureList = id => {
  const params = {
    TableName: tableName,
    Key: {
      id: id,
    },
  };
  return ddb.get(params).promise();
};

module.exports = { getSignatureList };
