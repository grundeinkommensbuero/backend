const { errorResponse } = require('../../../shared/apiResponse');
const { getCollectors } = require('../../../shared/users');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async () => {
  try {
    const collectors = await getCollectors();

    const formattedCollectors = formatCollectors(collectors);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: formattedCollectors,
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error while getting collectors', error);
    return errorResponse(500, 'error while getting collectors', error);
  }
};

const formatCollectors = users => {
  const collectors = { inGeneral: [], meetups: [] };

  for (const user of users) {
    if ('inGeneral' in user.wantsToCollect) {
      collectors.inGeneral.push(user);
    }

    if ('meetups' in user.wantsToCollect) {
      for (const meetup of user.wantsToCollect.meetups) {
        // Only add future meetups, therefore we add
        // one day from the meetup date, otherwise it would be beginning of that day
        const comparisonDate = new Date(meetup.date);
        comparisonDate.setDate(comparisonDate.getDate() + 1);

        if (comparisonDate > new Date()) {
          const index = collectors.meetups.findIndex(
            ({ date, location }) =>
              date === meetup.date && location === meetup.location
          );

          // If meetup is already in array we push the user to the array
          if (index !== -1) {
            collectors.meetups[index].collectors.push(user);
          } else {
            collectors.meetups.push({
              date: meetup.date,
              location: meetup.location,
              collectors: [user],
            });
          }
        }
      }
    }
  }

  collectors.meetups.sort((a, b) => new Date(a.date) - new Date(b.date));
  collectors.inGeneral.sort(
    (a, b) =>
      new Date(a.wantsToCollect.createdAt) -
      new Date(b.wantsToCollect.createdAt)
  );

  return collectors;
};
