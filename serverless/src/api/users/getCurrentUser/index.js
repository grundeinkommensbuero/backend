/**
 *  This endpoint gets the current authenticated user via the route users/me.
 *  The user id is taken from the authorization header.
 */

const { getUser } = require('../../../shared/users');
const { errorResponse } = require('../../../shared/apiResponse');
const {
  getMunicipalitiesOfUser,
  getMunicipality,
} = require('../../../shared/municipalities');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // get user id from auth token
    const userId = event.requestContext.authorizer.claims.sub;

    const result = await getUser(userId);

    // if user does not have Item as property, there was no user found
    if (!('Item' in result) || typeof result.Item === 'undefined') {
      return errorResponse(404, 'No user found with the passed user id');
    }

    const user = result.Item;

    // Get municipalities for which the user has signed up for
    const { Count, Items } = await getMunicipalitiesOfUser(userId);

    if (Count !== 0) {
      const municipalities = [];

      // Get municipality names for all municipalities
      await Promise.all(
        Items.map(async municipality => {
          const municipalityResult = await getMunicipality(municipality.ags);

          // Municipality should be definitely there, but we'll check anyway
          if ('Item' in municipalityResult) {
            municipalities.push({
              ...municipality,
              name: municipalityResult.Item.name,
            });
          }
        })
      );

      if (municipalities.length !== 0) {
        user.municipalities = municipalities;
      }
    }

    // Add empty array, if customNewsletters is not defined
    if (!('customNewsletters' in user)) {
      user.customNewsletters = [];
    }
    // Strip token from user
    delete user.customToken;

    // return user
    return {
      statusCode: 200,
      body: JSON.stringify({ user }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error getting user', error);
    return errorResponse(500, 'Error while getting user from table', error);
  }
};
