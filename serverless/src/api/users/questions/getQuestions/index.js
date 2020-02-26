const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { errorResponse } = require('../../../../shared/apiResponse');
const zipCodeMatcher = require('../../../../shared/zipCodeMatcher');

const tableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const defaultQuestionLimit = 10;

module.exports.handler = async event => {
  try {
    // If there is a query param use it as the number of questions to get,
    // otherwise the default
    const questionLimit =
      event.queryStringParameters && event.queryStringParameters.limit
        ? event.queryStringParameters.limit
        : defaultQuestionLimit;

    const questions = await getRecentQuestions(questionLimit);

    // return message (no content)
    return {
      statusCode: 200,
      headers: responseHeaders,
      isBase64Encoded: false,
      body: JSON.stringify({
        message: 'Successfully retrieved users with most recent questions',
        questions,
      }),
    };
  } catch (error) {
    console.log('error', error);
    return errorResponse(
      500,
      'Error while getting questions from table',
      error
    );
  }
};

const getRecentQuestions = async questionLimit => {
  const users = await getAllUsersWithQuestions();

  // Sort questions by most recent
  users.sort(
    (user1, user2) =>
      new Date(user2.questions[0].timestamp) -
      new Date(user1.questions[0].timestamp)
  );

  // get the first x elements of array
  const usersWithRecentQuestions = users.slice(0, questionLimit);

  const questions = [];

  // Construct new questions array
  // Match zip code to city and add it to user object
  for (let user of usersWithRecentQuestions) {
    if ('zipCode' in user) {
      if (!('city' in user)) {
        questions.push({
          body: user.questions[0].body,
          timestamp: user.questions[0].timestamp,
          user: {
            username: user.username,
            // Zip code should be string, but we need to make sure
            city: zipCodeMatcher.getCityByZipCode(user.zipCode.toString()),
            profilePictures: user.profilePictures,
          },
        });
      }
    }
  }

  return questions;
};

const getAllUsersWithQuestions = async (questions = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(questions)',
    ProjectionExpression: 'username, zipCode, profilePictures, questions',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  //add elements to existing array
  questions.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUsersWithQuestions(questions, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return questions;
  }
};
