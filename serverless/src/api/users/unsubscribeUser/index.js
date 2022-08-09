/**
 * This endpoint serves as a callback for when users unsubscribe via mailjet
 */

const { getUserByMail, unsubscribeUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { checkBasicAuth } = require('../../../shared/utils');

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(401, 'No basic auth provided');
    }

    const requestBody = JSON.parse(event.body);

    console.log('body', requestBody);

    try {
      // Request body has an array of events
      for (const { email } of requestBody) {
        // check if there is a user with the passed email
        const result = await getUserByMail(email);

        console.log('user', result);

        // if user does not have Item as property, there was no user found
        if (result.Count === 0) {
          console.log('No user found with the passed email');
        } else {
          await unsubscribeUser(result.Items[0]);
        }
      }

      // updating user was successful, return appropriate json
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log(error);
      return errorResponse(500, 'Error updating user', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

// Checks if basic auth is provided and username and password are correct
const isAuthorized = event => {
  return checkBasicAuth(event);
};
