/**
 * This endpoint can be used to sign users up from an external source.
 * The route is protected through a token in the query params.
 * In comparison to createUser, the user is also created in cognito, not just dynamo.
 */

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const {
  getUserByMail,
  createUserInCognito,
  confirmUserInCognito,
} = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { token } = require('../../../../queryToken');

const usersTableName = process.env.USERS_TABLE_NAME;
const municipalitiesTableName = process.env.MUNICIPALITIES_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    if (!validateToken(event.queryStringParameters)) {
      return errorResponse(401, 'Token not provided or incorrect');
    }

    if (!validateParams(requestBody)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    try {
      // Get user by mail to check if already exists and
      // if existing user
      const result = await getUserByMail(requestBody.email);

      if (result.Count !== 0) {
        const user = result.Items[0];

        if (
          'municipalCampaigns' in user &&
          user.municipalCampaigns.findIndex(
            place => place.ags === requestBody.ags
          ) !== -1
        ) {
          return {
            statusCode: 200,
            headers: responseHeaders,
            body: JSON.stringify({
              data: { userId: user.cognitoId },
              message: 'User had already signed up for this municipality',
            }),
            isBase64Encoded: false,
          };
        }

        // If user has signed up for the same municipality already,
        // we want to add the info this their existing account
        await Promise.all([
          updateUser(user.cognitoId, requestBody),
          addUserToMunicipality(requestBody.ags, user.cognitoId),
        ]);

        return {
          statusCode: 201,
          headers: responseHeaders,
          body: JSON.stringify({
            data: { userId: user.cognitoId },
            message: 'Municipality was added to existing user',
          }),
          isBase64Encoded: false,
        };
      }

      // otherwise proceed by creating the user and afterwards add user to municipality
      const userId = await createUser(requestBody);
      await addUserToMunicipality(requestBody.ags, userId);

      // return message (created)
      return {
        statusCode: 201,
        headers: responseHeaders,
        body: JSON.stringify({
          data: { userId },
          message:
            'User was successfully created or municipality was added to existing user',
        }),
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log('error while saving user', error);
      return errorResponse(500, 'error while saving user', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const updateUser = (
  userId,
  { username, zipCode, city, firstName, lastName, ags }
) => {
  const timestamp = new Date().toISOString();

  const data = {
    ':emptyList': [],
    ':firstName': firstName,
    ':lastName': lastName,
    ':username': username,
    ':updatedAt': timestamp,
    ':zipCode': zipCode,
    ':city': city,
    ':municipalCampaign': [{ createdAt: timestamp, ags }],
  };

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: userId },
    UpdateExpression: `
    SET 
    ${typeof username !== 'undefined' ? 'username = :username,' : ''}
    ${typeof firstName !== 'undefined' ? 'firstName = :firstName,' : ''}
    ${typeof lastName !== 'undefined' ? 'lastName = :lastName,' : ''}
    ${typeof zipCode !== 'undefined' ? 'zipCode = :zipCode,' : ''}
    ${typeof city !== 'undefined' ? 'city = :city,' : ''}
    municipalCampaigns = list_append(if_not_exists(municipalCampaigns, :emptyList), :municipalCampaign),
    updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

// Creates and confirms user in cognito, creates user in dynamo
// Returns newly created user id
const createUser = async requestBody => {
  const created = await createUserInCognito(requestBody.email);
  const userId = created.User.Username;

  // confirm user (by setting fake password)
  await confirmUserInCognito(userId);

  // now create dynamo resource
  await createUserInDynamo(userId, requestBody);

  return userId;
};

const createUserInDynamo = (
  userId,
  { email, zipCode, city, username, firstName, lastName, ags }
) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: usersTableName,
    Item: {
      cognitoId: userId,
      email: email.toLowerCase(),
      newsletterConsent: {
        value: true,
        timestamp,
      },
      createdAt: timestamp,
      firstName,
      lastName,
      zipCode,
      municipalCampaigns: [{ createdAt: timestamp, ags }],
      city,
      username,
      source: 'mge-municipal',
      // TODO confirmed
    },
  };

  return ddb.put(params).promise();
};

// Checks if municipality already exists in db
// If yes -> update it
// if no -> create new one
const addUserToMunicipality = async (ags, userId) => {
  const result = await getMunicipality(ags);

  if ('Item' in result) {
    // Municipality already exists, add user by updating it
    return updateMunicipality(ags, userId);
  }

  // Municipality does not exist, create it and add user at the same time
  return createMunicipality(ags, userId);
};

// Create new municipality including new list with first
// user who just now has signed up for it
const createMunicipality = (ags, userId) => {
  const timestamp = new Date().toISOString();
  const params = {
    TableName: municipalitiesTableName,
    Item: {
      ags,
      users: [{ id: userId, createdAt: timestamp }],
    },
  };

  return ddb.put(params).promise();
};

// Update existing municipalities by adding user to list
// of users who already have signed up for this municipality
const updateMunicipality = (ags, userId) => {
  const timestamp = new Date().toISOString();
  const user = { id: userId, createdAt: timestamp };

  const params = {
    TableName: municipalitiesTableName,
    Key: { ags },
    UpdateExpression:
      'SET #attribute = list_append(if_not_exists(#attribute, :emptyList), :user)',
    ExpressionAttributeValues: { ':user': [user], ':emptyList': [] },
    ExpressionAttributeNames: { '#attribute': 'users' },
  };

  return ddb.update(params).promise();
};

const getMunicipality = ags => {
  const params = {
    TableName: municipalitiesTableName,
    Key: {
      ags,
    },
  };

  return ddb.get(params).promise();
};

// Validate request body, only email is not optional
// If other keys are passed, the values should be strings
const validateParams = requestBody => {
  return (
    'email' in requestBody &&
    typeof requestBody.email === 'string' &&
    (!('firstName' in requestBody) ||
      typeof requestBody.firstName === 'string') &&
    (!('lastName' in requestBody) ||
      typeof requestBody.lastName === 'string') &&
    (!('username' in requestBody) ||
      typeof requestBody.username === 'string') &&
    (!('ags' in requestBody) || typeof requestBody.ags === 'string') &&
    (!('zipCode' in requestBody) || typeof requestBody.zipCode === 'string') &&
    (!('campaignSource' in requestBody) ||
      typeof requestBody.campaignSource === 'string')
  );
};

const validateToken = queryParams => {
  return queryParams && queryParams.token === token;
};
