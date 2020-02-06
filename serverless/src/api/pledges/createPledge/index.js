const { getUser, getUserByMail } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const { savePledge } = require('../../../shared/pledges');

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    try {
      console.log('request body', requestBody);

      if (!validateParams(requestBody)) {
        return errorResponse(400, 'One or more parameters are missing');
      }

      //request body might have email or user id
      let userId;
      let user;
      if ('userId' in requestBody) {
        userId = requestBody.userId;
        try {
          //check if there is a user with the passed user id
          const result = await getUser(userId);

          console.log('user', result);
          //if user does not have Item as property, there was no user found
          if (!('Item' in result) || typeof result.Item === 'undefined') {
            return errorResponse(404, 'No user found with the passed user id');
          }

          //we later need the user object
          user = result.Item;
        } catch (error) {
          console.log(error);
          return errorResponse(500, 'Error while getting user', error);
        }
      } else if ('email' in requestBody) {
        //in case the api only got the email instead of the id we need to get the user id from the db
        try {
          const result = await getUserByMail(requestBody.email);

          if (result.Count === 0) {
            return errorResponse(404, 'No user found with the passed email');
          } else {
            //we later need the user object and id
            user = result.Items[0];
            userId = user.cognitoId;
          }
        } catch (error) {
          console.log(error);
          return errorResponse(500, 'Error while getting user by email', error);
        }
      }

      // check if a pledge was already made
      if ('pledges' in user) {
        return errorResponse(401, 'A pledge for this user was already made');
      }

      // if no pledge was made, proceed...
      try {
        await savePledge(userId, requestBody);

        // saving pledge was successfull, return appropriate json
        return {
          statusCode: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          isBase64Encoded: false,
        };
      } catch (error) {
        console.log(error);
        return errorResponse(500, 'Error saving pledge', error);
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

const validateParams = requestBody => {
  return (
    ('userId' in requestBody || 'email' in requestBody) &&
    'newsletterConsent' in requestBody
  );
};
