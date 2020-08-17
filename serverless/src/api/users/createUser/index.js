const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const {
  validateZipCode,
  validatePhoneNumber,
  formatPhoneNumber,
  validateEmail,
} = require('../../../shared/utils');

const tableName = process.env.USERS_TABLE_NAME;

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
      const { userId } = requestBody;

      const result = await getUser(userId);

      // if user has Item as property, a user was found and therefore already exists
      if ('Item' in result) {
        return errorResponse(401, 'Not authorized to overwrite user');
      }

      // otherwise proceed by saving the user
      await saveUser(requestBody);

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
  phoneNumber,
}) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: tableName,
    Item: {
      cognitoId: userId,
      email: email.toLowerCase(),
      newsletterConsent: {
        value: newsletterConsent,
        timestamp,
      },
      createdAt: timestamp,
      zipCode: typeof zipCode !== 'undefined' ? zipCode.toString() : undefined, // Parse to string if is number
      referral,
      city,
      username,
      source,
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
