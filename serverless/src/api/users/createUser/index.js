const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
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

      //if user has Item as property, a user was found and therefore already exists
      if ('Item' in result) {
        return errorResponse(401, 'A pledge for this user was already made');
      }

      try {
        //otherwise proceed by saving the user
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
      return errorResponse(500, 'Error while getting user from table', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const saveUser = ({ newsletterConsent, email, userId, referral }) => {
  const timestamp = new Date().toISOString();

  const data = {
    cognitoId: userId,
    email: email,
    newsletterConsent: {
      value:
        // If there is no newsletter consent in the request we set it to true
        typeof newsletterConsent !== 'undefined' ? newsletterConsent : true,
      timestamp: timestamp,
    },
    createdAt: timestamp,
  };

  //if referral is undefined, don't add the key
  if (typeof referral !== 'undefined') {
    data.referral = referral;
  }

  const params = {
    TableName: tableName,
    Item: data,
  };

  return ddb.put(params).promise();
};

const validateParams = requestBody => {
  return (
    'userId' in requestBody &&
    'email' in requestBody &&
    'newsletterConsent' in requestBody
  );
};
