const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const usersTableName = process.env.USERS_TABLE_NAME;
const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;
const {} = require('../../shared/signatures');

module.exports.handler = async event => {};
