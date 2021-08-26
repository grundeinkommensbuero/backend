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

    const userId =
      event.queryStringParameters && event.queryStringParameters.userId;

    const questions = await getRecentQuestions(questionLimit, userId);

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

const getRecentQuestions = async (questionLimit, userId) => {
  const users = await getAllUsersWithQuestions();

  // Sort questions by most recent
  users.sort(
    (user1, user2) =>
      new Date(user2.questions[0].timestamp) -
      new Date(user1.questions[0].timestamp)
  );

  // get the first x elements of array
  // First get 10 more, so we can filter out hidden ones
  // This way we don't have to loop through the whole users array
  const usersWithRecentQuestions = users
    .slice(0, questionLimit + 10)
    .filter(user => !user.questions[0].hidden)
    .slice(0, questionLimit);

  const questions = [];

  // Construct new questions array
  for (const user of usersWithRecentQuestions) {
    const question = {
      body: user.questions[0].body,
      timestamp: user.questions[0].timestamp,
      user: {
        username: user.username,
        profilePictures: user.profilePictures,
      },
      belongsToCurrentUser: user.cognitoId === userId,
    };

    // Match zip code to city and add it to user object
    if (!('city' in user)) {
      if ('zipCode' in user) {
        // Zip code should be string, but we need to make sure
        question.user.city = zipCodeMatcher.getCityByZipCode(
          user.zipCode.toString()
        );
      }
    } else {
      question.user.city = user.city;
    }

    questions.push(question);
  }

  return questions;
};

const getAllUsersWithQuestions = async (questions = [], startKey = null) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(questions)',
    ProjectionExpression:
      'cognitoId, username, zipCode, profilePictures, questions, city',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  questions.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUsersWithQuestions(questions, result.LastEvaluatedKey);
  } 
  // otherwise return the array
  return questions;
};
