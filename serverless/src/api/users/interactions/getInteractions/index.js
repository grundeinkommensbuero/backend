const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const { errorResponse } = require('../../../../shared/apiResponse');
const zipCodeMatcher = require('../../../../shared/zipCodeMatcher');

const tableName = process.env.USERS_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const defaultInteractionLimit = 10;

module.exports.handler = async event => {
  try {
    // If there is a query param use it as the number of interactions to get,
    // otherwise the default
    const interactionLimit =
      event.queryStringParameters && event.queryStringParameters.limit
        ? event.queryStringParameters.limit
        : defaultInteractionLimit;

    const userId =
      event.queryStringParameters && event.queryStringParameters.userId;

    const interactions = await getRecentInteractions(interactionLimit, userId);

    // return message (no content)
    return {
      statusCode: 200,
      headers: responseHeaders,
      isBase64Encoded: false,
      body: JSON.stringify({
        message: 'Successfully retrieved users with most recent interactions',
        interactions,
      }),
    };
  } catch (error) {
    console.log('error', error);
    return errorResponse(
      500,
      'Error while getting interactions from table',
      error
    );
  }
};

const getRecentInteractions = async (interactionLimit, userId) => {
  const users = await getAllUsersWithInteractions();

  // Sort interactions by most recent
  users.sort(
    (user1, user2) =>
      new Date(user2.interactions[0].timestamp) -
      new Date(user1.interactions[0].timestamp)
  );

  // get the first x elements of array
  // First get 10 more, so we can filter out hidden ones
  // This way we don't have to loop through the whole users array
  const usersWithRecentInteractions = users
    .slice(0, interactionLimit + 10)
    .filter(user => !user.interactions[0].hidden)
    .slice(0, interactionLimit);

  const interactions = [];

  // Construct new interactions array
  for (const user of usersWithRecentInteractions) {
    const interaction = {
      body: user.interactions[0].body,
      timestamp: user.interactions[0].timestamp,
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
        interaction.user.city = zipCodeMatcher.getCityByZipCode(
          user.zipCode.toString()
        );
      }
    } else {
      interaction.user.city = user.city;
    }

    interactions.push(interaction);
  }

  return interactions;
};

const getAllUsersWithInteractions = async (
  interactions = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(interactions)',
    ProjectionExpression:
      'cognitoId, username, zipCode, profilePictures, interactions, city',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  interactions.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUsersWithInteractions(
      interactions,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return interactions;
};
