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
const {
  validateEmail,
  validatePhoneNumber,
  formatPhoneNumber,
} = require('../../../shared/utils');
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
      // Get municipality to save the name
      const municipalityResult = await getMunicipality(requestBody.ags);

      if (!('Item' in municipalityResult)) {
        return errorResponse(404, 'Municipality not found');
      }

      // We need the name later for the setting of newsletter settings
      const municipalityName = municipalityResult.Item.name;

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
          updateUser(user.cognitoId, user, requestBody, municipalityName),
          updateMunicipality(requestBody.ags, user.cognitoId),
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
      const userId = await createUser(requestBody, municipalityName);
      await updateMunicipality(requestBody.ags, userId);

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
  { customNewsletters },
  { username, ags, loginToken, phone, userToken, isEngaged },
  municipalityName
) => {
  const timestamp = new Date().toISOString();

  const newsletterSetting = {
    ags,
    value: true,
    extraInfo: false,
    timestamp,
    name: municipalityName,
  };

  if (typeof customNewsletters !== 'undefined') {
    // Only update the custom newsletters, if it does not contain
    // this municipality yet
    if (
      customNewsletters.findIndex(newsletter => newsletter.ags === ags) === -1
    ) {
      customNewsletters.push(newsletterSetting);
    }
  } else {
    // Custom newsletters was not defined, so we initialize it
    // by creating an array with settings for this municipality
    customNewsletters = [newsletterSetting];
  }

  const data = {
    ':emptyList': [],
    ':username': username,
    ':updatedAt': timestamp,
    ':municipalCampaign': [{ createdAt: timestamp, ags }],
    ':customNewsletters': customNewsletters,
    ':customToken':
      typeof loginToken !== 'undefined'
        ? { token: loginToken, timestamp }
        : undefined,
    ':phoneNumber': phone,
    ':userToken': userToken,
    ':isEngaged': isEngaged,
  };

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: userId },
    UpdateExpression: `
    SET 
    ${typeof phone !== 'undefined' ? 'phoneNumber = :phoneNumber,' : ''}
    ${typeof userToken !== 'undefined' ? 'mgeUserToken = :userToken,' : ''}
    ${typeof loginToken !== 'undefined' ? 'customToken = :customToken,' : ''}
    username = :username,
    municipalCampaigns = list_append(if_not_exists(municipalCampaigns, :emptyList), :municipalCampaign),
    customToken = :customToken,
    customNewsletters = :customNewsletters,
    isEngaged
    updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

// Creates and confirms user in cognito, creates user in dynamo
// Returns newly created user id
const createUser = async (requestBody, municipalityName) => {
  const created = await createUserInCognito(requestBody.email);
  const userId = created.User.Username;

  // confirm user (by setting fake password)
  await confirmUserInCognito(userId);

  // now create dynamo resource
  await createUserInDynamo(userId, requestBody, municipalityName);

  return userId;
};

const createUserInDynamo = (
  userId,
  { email, username, phone, ags, userToken, optedIn, loginToken },
  municipalityName
) => {
  const timestamp = new Date().toISOString();

  // If the user was already opted in at Mein Grundeinkommen
  // we want to set a boolean for that
  const confirmed = optedIn
    ? { value: true, optedInAtMge: true }
    : { value: false };

  const params = {
    TableName: usersTableName,
    Item: {
      cognitoId: userId,
      email: email.toLowerCase(),
      newsletterConsent: {
        value: true,
        timestamp,
      },
      customNewsletters: [
        {
          ags,
          value: true,
          extraInfo: false,
          timestamp,
          name: municipalityName,
        },
      ],
      createdAt: timestamp,
      municipalCampaigns: [{ createdAt: timestamp, ags }],
      username,
      // TODO: maybe also save phone number in cognito
      // depending on how I am going to implement the phone number feature
      phoneNumber: phone,
      source: 'mge-municipal',
      mgeUserToken: userToken,
      confirmed,
      customToken:
        typeof loginToken !== 'undefined'
          ? { token: loginToken, timestamp }
          : undefined,
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
    typeof requestBody.email === 'string' &&
    validateEmail(requestBody.email) &&
    typeof requestBody.username === 'string' &&
    typeof requestBody.ags === 'string' &&
    (typeof requestBody.userToken === 'undefined' ||
      typeof requestBody.userToken === 'string') &&
    typeof requestBody.optedIn === 'boolean' &&
    (typeof requestBody.userToken === 'undefined' ||
      typeof requestBody.loginToken === 'string') &&
    (!('phone' in requestBody) ||
      (typeof requestBody.phone === 'string' &&
        validatePhoneNumber(formatPhoneNumber(requestBody.phone))))
  );
};

const validateToken = queryParams => {
  return queryParams && queryParams.token === token;
};
