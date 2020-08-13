const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const {
  getMunicipality,
  createUserMunicipalityLink,
} = require('../../../shared/municipalities');

const {
  validateZipCode,
  validatePhoneNumber,
  formatPhoneNumber,
  validateEmail,
} = require('../../../shared/utils');

const tableName = process.env.USERS_TABLE_NAME;
const userMunicipalityTableName = process.env.USER_MUNICIPALITY_TABLE_NAME;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    if (!validateParams(requestBody)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    try {
      const { userId, ags } = requestBody;

      const result = await getUser(userId);

      // if user has Item as property, a user was found and therefore already exists
      if ('Item' in result) {
        return errorResponse(401, 'Not authorized to overwrite user');
      }

      // This array will be filled depending on which database calles will be made
      const promises = [];
      let municipalityName = null;

      // If ags was passed we also need to create the link
      // between municipality and user
      if (typeof ags !== 'undefined') {
        // Get municipality to fetch its name (to later save it in the communication settings)
        // and to check if munic even exists
        const municipalityResult = await getMunicipality(ags);

        if (!('Item' in municipalityResult)) {
          return errorResponse(404, 'Municipality not found');
        }

        // We need the name later for the setting of newsletter settings
        // and the population for updating the user municipality table
        const { population } = municipalityResult.Item;
        municipalityName = municipalityResult.Item.name;

        // Add creating the link between user and munic to the promises array
        // which will be executed afterwards
        promises.push(createUserMunicipalityLink(ags, userId, population));
      }

      promises.push(saveUser({ ...requestBody, municipalityName }));

      await Promise.all(promises);

      // return message (created)
      return {
        statusCode: 201,
        headers: responseHeaders,
        body: JSON.stringify({
          user: { id: userId },
          message: 'User was successfully created',
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

const saveUser = ({
  newsletterConsent,
  email,
  userId,
  referral,
  zipCode,
  city,
  username,
  source,
  customNewsletters,
  municipalityName,
  ags,
  store,
  phoneNumber,
}) => {
  const timestamp = new Date().toISOString();

  // If custom newsletters are part of request we use that value, if not
  // we build our own array (just one item) of custom newsletters depending on the ags
  // (but only if newsletter consent was passed as true)
  let customNewslettersArray;
  if (typeof customNewsletters !== 'undefined') {
    customNewslettersArray = customNewsletters;
  } else if (typeof ags !== 'undefined' && newsletterConsent) {
    customNewslettersArray = [
      {
        name: municipalityName,
        ags,
        value: true,
        extraInfo: false,
        timestamp,
      },
    ];
  }

  const params = {
    TableName: tableName,
    Item: {
      cognitoId: userId,
      email: email.toLowerCase(),
      newsletterConsent: {
        value: newsletterConsent,
        timestamp,
      },
      // Reminder mail setting is true by default
      reminderMails: {
        value: true,
        timestamp,
      },
      customNewsletters: customNewslettersArray,
      createdAt: timestamp,
      zipCode: typeof zipCode !== 'undefined' ? zipCode.toString() : undefined, // Parse to string if is number
      referral,
      city,
      username,
      source,
      store,
      confirmed: {
        value: false,
      },
      phoneNumber:
        typeof phoneNumber !== 'undefined'
          ? formatPhoneNumber(phoneNumber)
          : undefined, // Format it to all digit
    },
  };

  return ddb.put(params).promise();
};

// Validates if zip code and phone number are correct (if passed)
// and if the needed params are there
const validateParams = requestBody => {
  if ('customNewsletters' in requestBody) {
    const { customNewsletters } = requestBody;
    if (typeof customNewsletters !== 'object') {
      return false;
    }

    for (const newsletter of customNewsletters) {
      if (
        typeof newsletter.name !== 'string' ||
        typeof newsletter.value !== 'boolean' ||
        typeof newsletter.extraInfo !== 'boolean' ||
        typeof newsletter.timestamp !== 'string'
      ) {
        return false;
      }
    }
  }

  if ('zipCode' in requestBody && !validateZipCode(requestBody.zipCode)) {
    return false;
  }

  if (
    'phoneNumber' in requestBody &&
    !validatePhoneNumber(formatPhoneNumber(requestBody.phoneNumber))
  ) {
    return false;
  }

  return (
    'userId' in requestBody &&
    'email' in requestBody &&
    'newsletterConsent' in requestBody &&
    validateEmail(requestBody.email)
  );
};
