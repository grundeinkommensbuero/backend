const AWS = require('aws-sdk');
const { errorResponse } = require('../../../shared/apiResponse');
const uuid = require('uuid/v4');
const { constructCampaignId } = require('../../../shared/utils');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.MEETUPS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    try {
      if (!validateParams(requestBody)) {
        return errorResponse(400, 'One or more parameters are missing');
      }

      try {
        const meetup = await createMeetup(requestBody);

        // saving meetup was successfull, return appropriate json
        return {
          statusCode: 201,
          body: JSON.stringify({
            meetup,
            message: 'Meetup was successfully created',
          }),
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          isBase64Encoded: false,
        };
      } catch (error) {
        console.log(error);
        return errorResponse(500, 'Error saving meetup', error);
      }
    } catch (error) {
      console.log(error);
      return errorResponse(500, 'Non-specific error', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const validateParams = ({
  userId,
  type,
  coordinates,
  locationName,
  address,
  endTime,
  startTime,
  description,
  campaignCode,
  contact,
}) => {
  return (
    (typeof userId === 'undefined' || typeof userId === 'string') &&
    typeof coordinates === 'object' &&
    typeof type === 'string' &&
    (typeof locationName === 'undefined' || typeof locationName === 'string') &&
    (type === 'lists' ||
      (typeof startTime === 'string' && typeof endTime === 'string')) &&
    (typeof campaignCode === 'undefined' || typeof campaignCode === 'string') &&
    typeof description === 'string' &&
    (typeof contact === 'undefined' || typeof contact === 'string') &&
    typeof address === 'string'
  );
};

const createMeetup = async ({
  userId,
  type,
  coordinates,
  locationName,
  address,
  endTime,
  startTime,
  description,
  campaignCode,
  contact,
}) => {
  const timestamp = new Date().toISOString();
  // create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(campaignCode);

  const meetup = {
    id: uuid(),
    userId,
    type,
    coordinates,
    locationName,
    address,
    endTime,
    startTime,
    description,
    campaign,
    timestamp,
    contact,
  };

  const params = {
    TableName: tableName,
    Item: meetup,
  };

  await ddb.put(params).promise();

  return meetup;
};
