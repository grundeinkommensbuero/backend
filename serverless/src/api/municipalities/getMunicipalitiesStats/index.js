/**
 * This endpoint is used to get stats for municipalities.
 * */

const { errorResponse } = require('../../../shared/apiResponse');
const {
  getAllMunicipalitiesWithUsers,
  getAllMunicipalities,
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
    let shouldSendGoal;
    let shouldSendAllMunicipalities;

    // Check for query params (is null if there is none)
    if (event.queryStringParameters) {
      shouldSendGoal = !!event.queryStringParameters.goal;
      shouldSendAllMunicipalities = !!event.queryStringParameters.all;
    }

    // No query param was passed, therefore we get all municipalities for which people
    // have already signed up and compute the stats
    const userMuncipality = await getAllMunicipalitiesWithUsers();

    const stats = computeStats({
      userMuncipality,
      shouldSendGoal,
      shouldSendAllMunicipalities,
    });

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

const computeStats = async ({
  userMuncipality,
  shouldSendGoal,
  shouldSendAllMunicipalities,
}) => {
  const date = new Date();
  const wins = [];
  let newcomers = [];
  let relativeChangers = [];
  let absoluteChangers = [];
  const municipalitiesWithUsers = [];
  console.time('municipalities');
  const municipalityMap = new Map();
  for (const { userId, ags, createdAt, population } of userMuncipality) {
    if (!municipalityMap.has(ags)) {
      municipalityMap.add({ users: [{ userId, createdAt }], ags, population });
    } else {
      municipalityMap.get(ags).users.push({ userId, createdAt });
    }
  }

  // If we should return all municipalities, we get them
  // from the municipalities table, loop through and add the signups
  if (shouldSendAllMunicipalities) {
    const allMunicipalities = await getAllMunicipalities();
    for (let municipality of allMunicipalities) {
      if (municipalityMap.has(municipality.ags)) {
        const goal = getMunicipalityGoal(municipality.population);
        const signups = municipalityMap.get(municipality.ags).users.length;
        const { ags } = municipality;
        municipality = { ags, goal, signups };
      }
    }
  }
  console.timeEnd('municipalities');

  for (const { users, population, ags } of municipalityMap) {
    const goal = getMunicipalityGoal(population);

    const filteredUsers = users.filter(
      user => date - new Date(user.createdAt) < timePassed
    );

    const previous = users.length - filteredUsers.length;
    const current = users.length;

    if (current > goal) {
      wins.push({ ags, category: 'win', signups: [previous, current] });
    } else if (previous === 0) {
      newcomers.push({ ags, previous, current, filteredUsers });
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

    municipalitiesWithUsers.push({
      ags,
      signups: current,
      goal: shouldSendGoal ? goal : undefined,
    });
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
    municipalities: municipalitiesWithUsers,
  };
};

module.exports.timePassed = timePassed;
module.exports.computeStats = computeStats;
