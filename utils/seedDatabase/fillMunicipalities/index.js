const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;
const d3 = require("d3-scale");

// Params

const scalePromilleToGoal = "scaleLinear";
const rangePromilleToGoal = [0, 400];
const plz3Variance = [1, 4];

// ---- Utils ----------------------------------------------------------------------------

const readCSV = (path) => {
  return new Promise((res, rej) => {
    const arr = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on("data", (data) => arr.push(data))
      .on("end", () => {
        res(arr);
      });
  });
};

const getRandom = (min, max) => {
  const random = Math.random() * (max - min) + min;
  // return +random.toFixed(2);
  return random;
};

///  **************************************************************************************

// Paths to merge
const plzUsersPath = "./data/plz-3-meinbge-user-promille.csv";
const flatDataPath = "./data/flatData.json";
// Output
const outputPath = "./output/mockup-complete.json";
const gemeindenOutput = "./output/municipalities.json";
const signupsOutput = "./output/signups.json";
const responseOutput = "./output/response.json";

const readFiles = async () => {
  const plzUsers = await readCSV(plzUsersPath);
  const flatDataRaw = fs.readFileSync(flatDataPath, "utf8");
  const flatData = JSON.parse(flatDataRaw);
  return { plzUsers, flatData };
};

const mockupData = async () => {
  let { plzUsers, flatData, goals } = await readFiles();
  // Check data structure:
  // console.log(plzUsers, flatData);
  // console.log(plzUsers[0], flatData[0]);

  // Each ags should have:
  // goal
  // percentToGoal
  // --> signups

  const roundTo = (number, factor) => {
    return Math.round(number / factor) * factor;
  };

  const prettifyNumber = (number) => {
    let pretty = number;
    let steps = [
      { threshold: 20, roundTo: 1 },
      { threshold: 50, roundTo: 5 },
      { threshold: 150, roundTo: 10 },
      { threshold: 400, roundTo: 50 },
      { threshold: 4000, roundTo: 100 },
      { threshold: 10000, roundTo: 500 },
      { threshold: 40000, roundTo: 1000 },
      { threshold: 100000, roundTo: 5000 },
      { threshold: Infinity, roundTo: 10000 },
    ];
    const step = steps.find((x) => number < x.threshold);
    pretty = roundTo(number, step.roundTo);
    return pretty;
  };

  const getGoal = (population, minGoal = 7, goalFactor = 0.01) => {
    let goal = population * goalFactor;
    goal = Math.max(minGoal, prettifyNumber(goal));
    return goal;
  };

  // Goal
  flatData = flatData.map((x, i) => {
    const goal = getGoal(x.population);
    return { ...x, goal };
  });

  // Percent to goal
  // Match plzUsers to data
  // Check extent of promille and setup a scale
  const userPromille = plzUsers.map((x) => x.promille);
  const minPromille = Math.min(...userPromille);
  const maxPromille = Math.max(...userPromille);
  const promilleToGoalScale = d3[scalePromilleToGoal]()
    .domain([0, maxPromille + plz3Variance[1] / 2])
    .range(rangePromilleToGoal);
  console.log("Promille extent: ", minPromille, maxPromille);

  // Add percentToGoal
  flatData = flatData.map((x, i) => {
    const promille = +plzUsers.find((y) => y.plz === x.zipCode.substring(0, 3))
      .promille;

    const promilleVariance = getRandom(...plz3Variance);
    const promilleMin = promille - promilleVariance;
    const promilleMax = promille + promilleVariance;
    let promillePlz = getRandom(promilleMin, promilleMax);
    promillePlz = Math.max(0, promillePlz);
    let percentToGoal = promilleToGoalScale(promillePlz);
    percentToGoal = +percentToGoal.toFixed(3);
    return { ...x, percentToGoal };
  });
  console.log("Added percentToGoal: ", flatData[0]);

  const checkPercentToGoal = flatData.map((x) => x.percentToGoal);
  console.log(Math.min(...checkPercentToGoal), Math.max(...checkPercentToGoal));

  const grouped = flatData.reduce((acc, cur, i, src) => {
    const foundIndex = acc.findIndex((x) => x.ags === cur.ags);
    if (foundIndex === -1) {
      const {
        longitude,
        latitude,
        ags,
        name,
        district,
        state,
        population,
        goal,
      } = cur;
      const zipCodes = [cur.zipCode];
      const percentages = [cur.percentToGoal];
      acc.push({
        longitude,
        latitude,
        ags,
        name,
        zipCodes,
        district,
        state,
        population,
        goal,
        percentages,
      });
    } else {
      acc[foundIndex].zipCodes.push(cur.zipCode);
      acc[foundIndex].percentages.push(cur.percentToGoal);
    }

    return acc;
  }, []);
  console.log(grouped[0]);

  const groupedSignups = grouped.map((x) => {
    const { percentages, goal, ...rest } = x;
    const percentTest =
      percentages.reduce((a, b) => a + b) / percentages.length;

    const signups = parseInt((goal * percentTest) / 100);
    let percentToGoal = (signups / goal) * 100;
    percentToGoal = +percentToGoal.toFixed(2);
    return { ...rest, goal, signups, percentToGoal };
  });
  console.log(groupedSignups[0]);
  fs.writeFileSync(outputPath, JSON.stringify(groupedSignups));

  const gemeinden = groupedSignups.map((x) => {
    const { ags, name, longitude, latitude, population, goal } = x;
    const coordinates = [longitude, latitude];
    return { ags, name, coordinates, goal };
  });
  console.log(gemeinden[0]);
  fs.writeFileSync(gemeindenOutput, JSON.stringify(gemeinden));

  const gemeindenCSV = groupedSignups.map((x) => {
    const { ags, name, longitude, latitude, population } = x;
    return { ags, name, longitude, latitude, population };
  });
  const csvWriter = createCsvWriter({
    path: "./output/gemeinden.csv",
    header: [
      { id: "ags", title: "ags" },
      { id: "name", title: "name" },
      { id: "longitude", title: "longitude" },
      { id: "latitude", title: "latitude" },
      { id: "population", title: "population" },
    ],
  });
  csvWriter.writeRecords(gemeindenCSV);

  const signups = groupedSignups.map((x) => {
    const { ags, signups } = x;
    return { ags, signups };
  });
  console.log(signups[0]);
  fs.writeFileSync(signupsOutput, JSON.stringify(signups));

  const municipalities = groupedSignups.map((x) => {
    const { ags, signups } = x;
    return { ags, signups };
  });

  console.log(municipalities[0]);

  const response = {
    events: [{ ags: "11000000", signups: [30000, 40000] }],
    municipalities: municipalities,
    scale: [
      [1, 40000],
      [2000, 80000],
    ],
    timePassed: 6,
  };
  console.log(response);
  fs.writeFileSync(responseOutput, JSON.stringify(response));

  const characterSet = [
    ...new Set(gemeinden.map((x) => x.name.split("")).flat()),
  ];
  console.log(characterSet, characterSet.length);
  fs.writeFileSync("./output/characterSet.json", JSON.stringify(characterSet));
};

mockupData();
