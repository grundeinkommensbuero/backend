/**
 * This endpoint can be used to sign users up from an external source.
 * The route is protected through a token in the query params.
 * In comparison to createUser, the user is also created in cognito, not just dynamo.
 */



const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const ddb = DynamoDBDocument.from(new DynamoDB());
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
const userMunicipalityTableName = process.env.USER_MUNICIPALITY_TABLE_NAME;
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
      // 1. Get municipality to save the name
      // 2. Get user by mail to check if already exists
      const [municipalityResult, userResult] = await Promise.all([
        getMunicipality(requestBody.ags),
        getUserByMail(requestBody.email),
      ]);

      if (!('Item' in municipalityResult)) {
        return errorResponse(404, 'Municipality not found');
      }

      // We need the name later for the setting of newsletter settings
      // and the population for updating the user municipality table
      const { name: municipalityName, population } = municipalityResult.Item;

      if (userResult.Count !== 0) {
        const user = userResult.Items[0];

        // Query user municipality table to check if user has already signed up for this munic
        const userMunicipalityResult = await getUserMunicipalityLink(
          requestBody.ags,
          user.cognitoId
        );

        // If Item is result user has already signed up
        if ('Item' in userMunicipalityResult) {
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
          createUserMunicipalityLink(
            requestBody.ags,
            user.cognitoId,
            population
          ),
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
      await createUserMunicipalityLink(requestBody.ags, userId, population);

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
    ':username': username,
    ':updatedAt': timestamp,
    ':customNewsletters': customNewsletters,
    ':phoneNumber': phone !== null ? phone : undefined,
    // We also want to support passing optional params as null
    ':customToken':
      typeof loginToken !== 'undefined' && loginToken !== null // support null
        ? { token: loginToken, timestamp }
        : undefined,
    ':userToken': userToken !== null ? userToken : undefined, // support null
    ':isEngaged': isEngaged,
  };

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: userId },
    UpdateExpression: `
    SET 
    ${
      typeof phone !== 'undefined' && phone !== null
        ? 'phoneNumber = :phoneNumber,'
        : ''
    }
    ${
      typeof userToken !== 'undefined' && userToken !== null
        ? 'mgeUserToken = :userToken,'
        : ''
    }
    ${
      typeof loginToken !== 'undefined' && loginToken !== null
        ? 'customToken = :customToken,'
        : ''
    }
    username = :username,
    customNewsletters = :customNewsletters,
    isEngaged = :isEngaged,
    updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params);
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
  { email, username, phone, ags, userToken, optedIn, loginToken, isEngaged },
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
      username,
      // TODO: maybe also save phone number in cognito
      // depending on how I am going to implement the phone number feature.
      // We also want to support passing optional params as null
      phoneNumber: phone !== null ? phone : undefined,
      source: 'mge-municipal',
      mgeUserToken: userToken !== null ? userToken : undefined, // support null
      confirmed,
      isEngaged,
      customToken:
        typeof loginToken !== 'undefined' && loginToken !== null // support null
          ? { token: loginToken, timestamp }
          : undefined,
    },
  };

  return ddb.put(params);
};

// Update userMunicipality table to create the link between user and munic
const createUserMunicipalityLink = (ags, userId, population) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: userMunicipalityTableName,
    Item: {
      ags,
      userId,
      createdAt: timestamp,
      population,
    },
  };

  return ddb.put(params);
};

const getMunicipality = ags => {
  const params = {
    TableName: municipalitiesTableName,
    Key: {
      ags,
    },
  };

  return ddb.get(params);
};

const getUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: userMunicipalityTableName,
    Key: {
      ags,
      userId,
    },
  };

  return ddb.get(params);
};

// Validate request body, only email is not optional
// If other keys are passed, the values should be strings
const validateParams = requestBody => {
  return (
    typeof requestBody.email === 'string' &&
    validateEmail(requestBody.email) &&
    typeof requestBody.username === 'string' &&
    requestBody.username.length >= 3 &&
    typeof requestBody.isEngaged === 'boolean' &&
    typeof requestBody.ags === 'string' &&
    (typeof requestBody.userToken === 'undefined' ||
      requestBody.userToken === null ||
      typeof requestBody.userToken === 'string') &&
    typeof requestBody.optedIn === 'boolean' &&
    (typeof requestBody.loginToken === 'undefined' ||
      requestBody.loginToken === null ||
      typeof requestBody.loginToken === 'string') &&
    (typeof requestBody.phone === 'undefined' ||
      requestBody.phone === null ||
      (typeof requestBody.phone === 'string' &&
        validatePhoneNumber(formatPhoneNumber(requestBody.phone))))
  );
};

const validateToken = queryParams => {
  return queryParams && queryParams.token === token;
};
