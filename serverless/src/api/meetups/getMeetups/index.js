const AWS = require('aws-sdk');
const { errorResponse } = require('../../../shared/apiResponse');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.MEETUPS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async () => {
  try {
    const meetups = await getAllMeetups();

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: meetups,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting meetups', error);
    return errorResponse(500, 'error while getting meetups', error);
  }
};

const getAllMeetups = async (meetups = [], startKey = null) => {
  const params = {
    TableName: tableName,
    // Only get meetups which haven't ended yet or places where you can sign
    FilterExpression: 'endTime >= :date OR #type = :type',
    ExpressionAttributeValues: {
      ':date': new Date().toISOString(),
      ':type': 'lists',
    },
    ExpressionAttributeNames: {
      '#type': 'type',
    },
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  meetups.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getAllMeetups(meetups, result.LastEvaluatedKey);
  }

  // otherwise return the array
  return meetups;
};
