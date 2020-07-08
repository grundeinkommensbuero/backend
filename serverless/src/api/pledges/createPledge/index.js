const { getUser } = require('../../../shared/users');
const { savePledge } = require('../../../shared/pledges');
const { errorResponse } = require('../../../shared/apiResponse');

module.exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    try {
      console.log('request body', requestBody);

      if (!validateParams(event, requestBody)) {
        return errorResponse(400, 'One or more parameters are missing');
      }

      try {
        const { userId } = event.pathParameters;
        const { pledgeId } = requestBody;

        // check if there is a user with the passed user id
        const result = await getUser(userId);

        console.log('user', result);
        // if user has Item as property, a user was found and therefore already exists
        if (!('Item' in result)) {
          return errorResponse(404, 'User not found');
        }

        const user = result.Item;

        if ('pledges' in user) {
          for (const pledge of user.pledges) {
            if (pledge.campaign.code === pledgeId) {
              return errorResponse(
                401,
                'This pledge for this user was already made'
              );
            }
          }
        }

        // if no pledge was made, proceed...

        // savePledge returns the updated values of the user record (-> the pledges array)
        const {
          Attributes: { pledges },
        } = await savePledge(userId, requestBody);

        // saving pledge was successfull, return appropriate json
        return {
          statusCode: 201,
          body: JSON.stringify({
            userId,
            // We only want to return the newly created pledge
            pledge: pledges[pledges.length - 1],
            message: 'Pledge was successfully created',
          }),
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

const validateParams = (event, requestBody) => {
  return 'userId' in event.pathParameters && 'pledgeId' in requestBody;
};
