/**
 * This endpoint is used to get stats for municipalities.
 * One ags (id of municipalities) can be passed via query param.
 */

const { errorResponse } = require('../../../shared/apiResponse');
const {
  getMunicipality,
  getAllMunicipalitiesWithUsers,
} = require('../../../shared/municipalities');
const { getMunicipalityGoal } = require('../../../shared/utils');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const timePassed = 6 * 60 * 60 * 1000;
const amountOfWins = 15;
const amountOfNewcomers = 15;
const amountOfChanged = 10;
const changeThresholds = { absolute: 2000, relative: 30, population: 40000 };
const scale = [
  [1, 40000],
  [2000, 80000],
];

module.exports.handler = async event => {
  try {
    // Check for query params (is null if there is none)
    if (event.queryStringParameters && event.queryStringParameters.ags) {
      const ags = event.queryStringParameters.ags;
      const result = await getMunicipality(ags);

      if (!('Item' in result)) {
        // No municipality with the passed ags found
        return errorResponse(404, 'No municipality found with the passed ags');
      }

      const signUpCount = result.Item.users.length;

      const goal = getMunicipalityGoal(result.Item.population);

      // compute percent to goal
      const percentToGoal = +((signUpCount / goal) * 100).toFixed(1);

      return {
        statusCode: 200,
        body: JSON.stringify({
          data: { signups: signUpCount, percentToGoal, goal },
        }),
        headers: responseHeaders,
        isBase64Encoded: false,
      };
    }

    // No query param was passed, therefore we get all municipalities for which people
    // have already signed up and compute the stats
    const municipalities = await getAllMunicipalitiesWithUsers();

    const stats = computeStats(municipalities);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: { ...stats, timePassed, scale },
      }),
      headers: responseHeaders,
      isBase64Encoded: false,
    };
  } catch (error) {
    console.log('error getting stats for places', error);
    return errorResponse(500, 'Error while getting stats for places', error);
  }
};

const computeStats = municipalities => {
  const date = new Date();
  const wins = [];
  let newcomers = [];
  let relativeChangers = [];
  let absoluteChangers = [];
  const allMunicipalities = [];

  for (const { users, population, ags } of municipalities) {
    const goal = getMunicipalityGoal(population);

    const filteredUsers = users.filter(
      user => date - new Date(user.createdAt) < timePassed
    );

    const previous = users.length - filteredUsers.length;
    const current = users.length;

    if (current > goal) {
      wins.push({ ags, category: 'win', signups: [previous, current] });
    } else if (previous === 0) {
      newcomers.push({ previous, current, filteredUsers });
    } else if (
      (current / previous - 1) * 100 > changeThresholds.relative &&
      population > changeThresholds.population
    ) {
      const relativeChange = (current / previous - 1) * 100;
      relativeChangers.push({ ags, previous, current, relativeChange });
    } else if (current - previous > changeThresholds.absolute) {
      const absoluteChange = current - previous;
      absoluteChangers.push({ ags, previous, current, absoluteChange });
    }

    allMunicipalities.push({ ags, signups: current });
  }

  // Only take the 15 municipalities with the most signups
  wins.sort((a, b) => a.signups[1] - b.signups[1]).slice(0, amountOfWins);

  // Sort newcomers by most current signup, also only 15
  newcomers
    .sort((a, b) => {
      const timeA = new Date(
        a.filteredUsers[a.filteredUsers.length - 1].createdAt
      );
      const timeB = new Date(
        b.filteredUsers[b.filteredUsers.length - 1].createdAt
      );
      return timeA - timeB;
    })
    .slice(0, amountOfNewcomers);

  relativeChangers
    .sort((a, b) => a.relativeChange - b.relativeChange)
    .slice(0, amountOfChanged);

  absoluteChangers
    .sort((a, b) => a.absoluteChange - b.absoluteChange)
    .slice(0, amountOfChanged);

  // Bring newcomers into [previous, current] structure
  newcomers = newcomers.map(newcomer => ({
    ags: newcomer.ags,
    signups: [newcomer.previous, newcomer.current],
    category: 'new',
  }));

  // Bring changers into correct structure
  relativeChangers = relativeChangers.map(changer => ({
    ags: changer.ags,
    signups: [changer.previous, changer.current],
    category: 'change',
  }));

  absoluteChangers = absoluteChangers.map(changer => ({
    ags: changer.ags,
    signups: [changer.previous, changer.current],
    category: 'change',
  }));

  return {
    events: [...wins, ...newcomers, ...relativeChangers, ...absoluteChangers],
    municipalities: allMunicipalities,
  };
};

module.exports.timePassed = timePassed;
module.exports.computeStats = computeStats;
