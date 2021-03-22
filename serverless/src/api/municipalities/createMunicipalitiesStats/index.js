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
  getStatsJson,
  getExistingUsers,
} = require('../../../shared/municipalities');
const { getMunicipalityGoal } = require('../../../shared/utils');

const timePassed = 24 * 60 * 60 * 1000;
const amountOfWins = 16;
const amountOfNewcomers = 16;
const amountOfChanged = 16;
const changeThresholds = { absolute: 300, relative: 20 };
const signupThreshold = 350;

module.exports.handler = async event => {
  try {
    // No query param was passed, therefore we get all municipalities for which people
    // have already signed up and compute the stats
    const userMuncipality = await getAllMunicipalitiesWithUsers();

    // We need to get the existing stats so we can include the previous count
    const json = await getStatsJson('statsWithEvents.json');

    const body = JSON.parse(json.Body.toString());
    const previousSummary = body.summary;
    delete previousSummary.previous;

    const statsWithAllMunicipalities = await computeStats({
      userMuncipality,
      shouldSendAllMunicipalities: true,
    });

    const statsWithEvents = await computeStats({
      userMuncipality,
      shouldSendAllMunicipalities: false,
      previousSummary,
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
  previousSummary,
}) => {
  let date = new Date();
  if (stage === 'dev') {
    date = new Date(2021, 0, 6, 16, 0, 0);
  }
  let wins = [];
  let newcomers = [];
  let relativeChangers = [];
  let absoluteChangers = [];
  const municipalitiesWithUsers = [];
  const qualifiedMunicipalities = [];

  const municipalityMap = new Map();
  for (const { userId, ags, createdAt, population } of userMuncipality) {
    if (!municipalityMap.has(ags)) {
      municipalityMap.set(ags, {
        users: [{ userId, createdAt }],
        population,
      });
    } else {
      const municipality = municipalityMap.get(ags);

      municipality.users.push({ userId, createdAt });
    }
  }

  // If we should return all municipalities, we get them
  // from the municipalities table, loop through and add the signups by mapping the array
  if (shouldSendAllMunicipalities) {
    const allMunicipalities = await getAllMunicipalities();

    const allMunicipalitiesWithStats = allMunicipalities.map(municipality => {
      const goal = getMunicipalityGoal(municipality.population);
      const { ags } = municipality;

      let signups = 0;

      signups += getExistingUsers(ags);

      if (municipalityMap.has(municipality.ags)) {
        const { users } = municipalityMap.get(municipality.ags);

        signups = users.length;
      }

      return {
        ags,
        goal,
        signups,
      };
    });

    return { municipalities: allMunicipalitiesWithStats };
  }

  for (const [ags, { users, population }] of municipalityMap) {
    const goal = getMunicipalityGoal(population);

    const filteredUsers = users.filter(
      user => date - new Date(user.createdAt) < timePassed
    );

    let signups = users.length;

    signups += getExistingUsers(ags);

    // We add our already existing user base

    const previous = signups - filteredUsers.length;
    const current = signups;

    if (current > goal && previous < goal && current > signupThreshold) {
      wins.push({ ags, category: 'win', signups: [previous, current] });
      // Newcomers used to be previous === 0,
      // but these tend to have low signup numbers
      // leading to them not being visible in the animation
    } else if (previous < signupThreshold && current > signupThreshold) {
      newcomers.push({ ags, previous, current, filteredUsers });
    } else if (
      (current / previous - 1) * 100 > changeThresholds.relative &&
      current > signupThreshold
    ) {
      const relativeChange = (current / previous - 1) * 100;
      relativeChangers.push({ ags, previous, current, relativeChange });
    } else if (current - previous > changeThresholds.absolute) {
      const absoluteChange = current - previous;
      absoluteChangers.push({ ags, previous, current, absoluteChange });
    }

    // If municipality is qualified add it to array
    if (current > goal) {
      qualifiedMunicipalities.push({ ags, current, population });
    }

    municipalitiesWithUsers.push({
      ags,
      signups: current,
    });
  }

  // Only take the 15 municipalities with the most signups
  wins.sort((a, b) => a.signups[1] - b.signups[1]);
  wins = wins.slice(0, amountOfWins);

  // Sort newcomers by most current signup, also only 15
  newcomers.sort((a, b) => {
    // NOTE: sorted by time
    // const timeA = new Date(
    //   a.filteredUsers[a.filteredUsers.length - 1].createdAt
    // );
    // const timeB = new Date(
    //   b.filteredUsers[b.filteredUsers.length - 1].createdAt
    // );
    // return timeA - timeB;
    // NOTE: current implementation: sorted by size
    return a.current - b.current;
  });
  newcomers = newcomers.slice(0, amountOfNewcomers);

  relativeChangers.sort((a, b) => a.relativeChange - b.relativeChange);
  relativeChangers = relativeChangers.slice(0, amountOfChanged / 2);

  absoluteChangers.sort((a, b) => a.absoluteChange - b.absoluteChange);
  absoluteChangers = absoluteChangers.slice(0, amountOfChanged / 2);

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
    qualifiedMunicipalities,
    summary: {
      previous: previousSummary,
      users: userMuncipality.length + Math.round(17802 * 0.7) + 10000,
      municipalities: municipalitiesWithUsers.length + 3,
      timestamp: new Date().toISOString(),
    },
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
