const { errorResponse } = require('../../../shared/apiResponse');
const { getUsersWithDonations } = require('../../../shared/users');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    // Check if admin has only permission for one municipality
    if (!isAuthorized(event)) {
      return errorResponse(
        404,
        'Admin only has permission for a specific municipality'
      );
    }

    const users = await getUsersWithDonations();

    const donations = formatDonations(users);

    return {
      statusCode: 200,
      body: JSON.stringify({
        donations,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting donations', error);
    return errorResponse(500, 'error while getting donations', error);
  }
};

const formatDonations = users => {
  const recurringDonations = [];
  const onetimeDonations = [];
  for (const user of users) {
    if ('onetimeDonations' in user.donations) {
      for (const donation of user.donations.onetimeDonations) {
        onetimeDonations.push(donation);
      }
    }

    if ('recurringDonation' in user.donations) {
      recurringDonations.push(user.donations.recurringDonation);
    }
  }

  sortDonations(recurringDonations);
  sortDonations(onetimeDonations);

  return { recurringDonations, onetimeDonations };
};

// Sort donations by most recent (cancelled at the top, then updated, then created)
const sortDonations = donations => {
  donations.sort((donation1, donation2) => {
    // If both donations were cancelled the most recent should come first
    if ('cancelledAt' in donation1 && 'cancelledAt' in donation2) {
      return new Date(donation2.cancelledAt) - new Date(donation1.cancelledAt);
    }

    if ('cancelledAt' in donation1) {
      // donation 1 first
      return -1;
    }

    if ('cancelledAt' in donation2) {
      // donation 2 first
      return 1;
    }

    // Same for updatedAt
    // If both donations were cancelled the most recent should come first
    if ('updatedAt' in donation1 && 'updatedAt' in donation2) {
      return new Date(donation2.updatedAt) - new Date(donation1.updatedAt);
    }

    if ('updatedAt' in donation1) {
      // donation 1 first
      return -1;
    }

    if ('updatedAt' in donation2) {
      // donation 2 first
      return 1;
    }

    // If not updated or cancelled more recently created should come first
    return new Date(donation2.createdAt) - new Date(donation1.createdAt);
  });
};

const isAuthorized = event => {
  return !event.requestContext.authorizer.claims['custom:ags'];
};
