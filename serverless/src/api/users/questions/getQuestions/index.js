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

  const questions = [];

  // Construct new questions array
  users.forEach(user => {
    user.questions.forEach(question => {
      if (!question.hidden) {
        const questionObj = {
          body: question.body,
          timestamp: question.timestamp,
          user: {
            username: user.username,
            profilePictures: user.profilePictures,
            userId: user.cognitoId,
          },
          belongsToCurrentUser: user.cognitoId === userId,
        };

        // Match zip code to city and add it to user object
        if (!('city' in user)) {
          if ('zipCode' in user) {
            // Zip code should be string, but we need to make sure
            questionObj.user.city = zipCodeMatcher.getCityByZipCode(
              user.zipCode.toString()
            );
          }
        } else {
          questionObj.user.city = user.city;
        }
        questions.push(questionObj);
      }
    });
  });

  // Sort questions by date
  questions.sort(
    (question1, question2) =>
      new Date(question2.timestamp) - new Date(question1.timestamp)
  );

  // get requested number of questions
  const sliceBy = questionLimit != 0 ? questionLimit : questions.length;
  return questions.slice(0, sliceBy);
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
