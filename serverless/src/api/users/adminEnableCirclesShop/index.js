const { errorResponse } = require('../../../shared/apiResponse');
const { getUser } = require('../../../shared/users');
const { trustCirclesUser, enableShop } = require('../../../shared/circles');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // check if there is a user with the passed user id
    const { userId } = event.pathParameters;
    const { Item: user } = await getUser(userId);

    // if user does not have Item as property, there was no user found
    if (typeof user === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    if (
      'store' in user &&
      'circlesResumee' in user.store &&
      'safeAddress' in user.store.circlesResumee
    ) {
      // NOTE: Only enable shop in the user for now (we need to trigger trust and check by hand beforehand,
      // if trust was successful), because this structure does not really make sense
      // because the trust process might take a few minutes in the background and might
      // not work at all. An idea would be to initiate the trust and save a flag in the user.
      // For all users with that flag it should be checked in a cron job if the trust worked.
      // Only then the shop should be enabled.

      // await Promise.all([
      //   trustCirclesUser(user.store.circlesResumee.safeAddress),
      //   enableShop(user),
      // ]);

      await enableShop(user);
    } else {
      return errorResponse(400, 'User has no safe address');
    }

    return {
      statusCode: 204,
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting users', error);
    return errorResponse(500, 'error while getting power users', error);
  }
};
