/**
 * This endpoint is used to compute stats for municipalities and save them
 * as a json file on the server.
 * */

const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const s3 = new AWS.S3(config);
const bucket = 'xbge-municipalities-stats';
const stage = process.env.STAGE;

const { errorResponse } = require('../../../shared/apiResponse');
const {
  getAllMunicipalitiesWithUsers,
  getAllMunicipalities,
} = require('../../../shared/municipalities');
const { getMunicipalityGoal } = require('../../../shared/utils');

const timePassed = 6 * 60 * 60 * 1000;
const amountOfWins = 15;
const amountOfNewcomers = 15;
const amountOfChanged = 10;
const changeThresholds = { absolute: 2000, relative: 30, population: 40000 };

module.exports.handler = async event => {
  try {
    // No query param was passed, therefore we get all municipalities for which people
    // have already signed up and compute the stats
    const userMuncipality = await getAllMunicipalitiesWithUsers();

    const statsWithAllMunicipalities = computeStats({
      userMuncipality,
      shouldSendAllMunicipalities: true,
    });

    const statsWithEvents = computeStats({
      userMuncipality,
      shouldSendAllMunicipalities: false,
    });

    await saveJson(statsWithAllMunicipalities, 'statsWithAll.json');
    await saveJson(statsWithEvents, 'statsWithEvents.json');

    return event;
  } catch (error) {
    console.log('error creating stats for places', error);
    return errorResponse(500, 'Error while getting stats for places', error);
  }
};

const computeStats = async ({
  userMuncipality,
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
      municipalityMap.set(ags, {
        users: [{ userId, createdAt }],
        population,
      });
    } else {
      municipalityMap.get(ags).users.push({ userId, createdAt });
    }
  }
  console.timeEnd('municipalities');

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

    return { municipalities: allMunicipalities };
  }

  for (const [ags, { users, population }] of municipalityMap) {
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

const saveJson = (json, fileName) => {
  const params = {
    Bucket: bucket,
    ACL: 'public-read',
    Key: `${stage}/${fileName}`,
    Body: JSON.stringify(json),
    ContentType: 'application/json',
  };

  return s3.upload(params).promise();
};

module.exports.timePassed = timePassed;
module.exports.computeStats = computeStats;