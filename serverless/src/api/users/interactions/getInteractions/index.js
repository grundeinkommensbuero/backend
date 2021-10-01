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
        ? parseInt(event.queryStringParameters.limit, 10)
        : defaultInteractionLimit;

    // If a type is passed only interactions with this type are returned
    const interactionType =
      event.queryStringParameters && event.queryStringParameters.type;

    const campaignCode =
      event.queryStringParameters && event.queryStringParameters.campaignCode;

    const interactions = await getRecentInteractions(
      interactionLimit,
      interactionType,
      campaignCode
    );

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

const getRecentInteractions = async (
  interactionLimit,
  interactionType,
  campaignCode
) => {
  const users = await getAllUsersWithInteractions();

  const interactions = [];

  // Construct new interactions array
  users.forEach(user => {
    user.interactions.forEach(interaction => {
      if (
        !interaction.hidden &&
        (!interactionType || interaction.type === interactionType) &&
        (!campaignCode ||
          (interaction.campaign && interaction.campaign.code === campaignCode))
      ) {
        const interactionObj = {
          body: interaction.body,
          timestamp: interaction.timestamp,
          campaign: interaction.campaign,
          type: interaction.type,
          user: {
            username: user.username,
            profilePictures: user.profilePictures,
            userId: user.cognitoId,
          },
        };

        // Match zip code to city and add it to user object
        if (!('city' in user)) {
          if ('zipCode' in user) {
            // Zip code should be string, but we need to make sure
            interactionObj.user.city = zipCodeMatcher.getCityByZipCode(
              user.zipCode.toString()
            );
          }
        } else {
          interactionObj.user.city = user.city;
        }
        interactions.push(interactionObj);
      }
    });
  });

  // Sort interactions by date
  interactions.sort(
    (interaction1, interaction2) =>
      new Date(interaction2.timestamp) - new Date(interaction1.timestamp)
  );

  // get requested number of interactions
  const sliceBy =
    interactionLimit !== 0 ? interactionLimit : interactions.length;

  return interactions.slice(0, sliceBy);
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
