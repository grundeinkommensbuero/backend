const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

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

const convertCommaStringToNumber = (string) => {
  return +string.replace(",", ".");
};

//--------------------------------------------------------------------------------------//
//                                       Matching                                       //
//--------------------------------------------------------------------------------------//
// Paths to merge
const PLZPath = "./data/zuordnung_plz_ort_landkreis.csv";
const gemeindePath = "./data/gemeinden_simplify0.geojson";
const manualDataPath = "./data/manualData.json";
const updateDataPath = "./data/updateData.json";
// Logs and output
const unsafeMergesPath = "./output/logs/unsafeMerges.json";
const noMatchesPath = "./output/logs/noMatches.json";
const flatDataPath = "./output/logs/flatData.json";
const outputPath = "./output/places.json";

// Read and parse those files
const readFiles = async () => {
  const PLZs = await readCSV(PLZPath);
  const gemeindenRaw = fs.readFileSync(gemeindePath, "utf8");
  const gemeinden = JSON.parse(gemeindenRaw).features;
  const manualRaw = fs.readFileSync(manualDataPath, "utf8");
  const manualData = JSON.parse(manualRaw);
  const updateRaw = fs.readFileSync(updateDataPath, "utf8");
  const updateData = JSON.parse(updateRaw);
  return { PLZs, gemeinden, manualData, updateData };
};

const mergeFiles = async () => {
  const { PLZs, gemeinden, manualData, updateData } = await readFiles();
  // Extract only relevant features from
  const gemeindenProps = gemeinden.map((x, i) => {
    const { properties } = x;
    const { AGS: ags, GEN: name } = properties;
    let result = { ags, name };
    if (properties.destatis) {
      let {
        population,
        center_lon: longitude,
        center_lat: latitude,
        zip: zipCode,
      } = properties.destatis;
      longitude = convertCommaStringToNumber(longitude);
      latitude = convertCommaStringToNumber(latitude);
      result = { ...result, longitude, latitude, zipCode, population };
      if (i === 0) {
        console.log("Reduced data structure for gemeinden data set: ", result);
      }
    }
    return result;
  });

  const plzProps = PLZs.map((x, i) => {
    const {
      ags,
      ort: name,
      plz: zipCode,
      landkreis: district,
      bundesland: state,
    } = x;
    const result = { ags, name, zipCode, district, state };
    if (i === 0) {
      console.log("Reduced data structure for plz data set: ", result);
    }
    return result;
  });

  console.log("Matching gemeinden on plz with AGS ... ");

  plzGemeindenAgsMatch = plzProps.map((p) => {
    const agsMatch = gemeindenProps.filter((g) => p.ags === g.ags);
    return { ...p, agsMatch };
  });

  // ---- Unsafe Merges Analysis -----------------------------------------------------------
  console.log("--- Merge analysis ---");
  console.log("Merges are not safe when: ");
  console.log("  - There’s no match");
  console.log("  - Single match without all the info");
  console.log("  - Duplicate matches with different info");
  const unsafeMerges = plzGemeindenAgsMatch.filter((x) => {
    if (x.agsMatch.length !== 1) {
      return true;
    }
    if (x.agsMatch.length === 1 && !x.agsMatch[0].population) {
      return true;
    }
    return false;
  });

  fs.writeFileSync(unsafeMergesPath, JSON.stringify(unsafeMerges, null, 2));
  console.log("Unsafe merges written to ./data/unsafeMerges.json");

  const unsafeMergesSingles = unsafeMerges.filter(
    (x) => x.agsMatch.length === 1
  );
  console.log("Single Matches with missing Info: ", unsafeMergesSingles.length);

  const unsafeMergesDuplicates = unsafeMerges.filter(
    (x) => x.agsMatch.length > 1
  );
  console.log("Matches with duplicates: ", unsafeMergesDuplicates.length);

  const unsafeMergesDuplicatesWithDifferentPopulation = unsafeMergesDuplicates.filter(
    (x) => !x.agsMatch.every((e) => e.population === x.agsMatch[0].population)
  );
  console.log(
    "Matches with duplicates that have different population info: ",
    unsafeMergesDuplicatesWithDifferentPopulation.length
  );
  // The matched ones are safe
  if (
    unsafeMergesSingles.length === 0 &&
    unsafeMergesDuplicatesWithDifferentPopulation.length === 0
  ) {
    console.log("--> it’s safe to merge when there is a match");
  }

  const noMatches = unsafeMerges.filter((x) => x.agsMatch.length === 0);
  console.log("Missing matches: ", noMatches.length);
  fs.writeFileSync(noMatchesPath, JSON.stringify(noMatches, null, 2));
  console.log("Missing matches written to ./data/noMatches.json");
  //  **************************************************************************************

  //--------------------------------------------------------------------------------------//
  //                                       Merging                                        //
  //--------------------------------------------------------------------------------------//

  const matches = plzGemeindenAgsMatch.filter((x) => x.agsMatch.length >= 1);
  const mergedMatches = matches.map((x, i) => {
    const { ags, name, zipCode, district, state } = x;
    const { longitude, latitude, population } = x.agsMatch[0];

    result = {
      longitude,
      latitude,
      ags,
      name,
      zipCode,
      district,
      state,
      population,
    };

    if (i === 0) {
      console.log("Example of combined data structure: ", result);
    }
    return result;
  });

  const flatData = [...mergedMatches, ...manualData];

  // ---- Tests ----------------------------------------------------------------------------
  console.log("-- Tests:");
  const testKeys = {
    longitude: "number",
    latitude: "number",
    ags: "string",
    name: "string",
    zipCode: "string",
    district: "string",
    state: "string",
    population: "number",
    // goal: "number",
  };
  const propTest = flatData.filter((x) => {
    for (const key in testKeys) {
      if (testKeys.hasOwnProperty(key) && x.hasOwnProperty(key)) {
        if (typeof x[key] === testKeys[key]) {
          return false;
        } else {
          console.log(`${key} is of the wrong type in: `, x);
          return true;
        }
      } else {
        console.log("Does not have all keys: ", x);
        return true;
      }
    }
  });
  console.log(
    "Places that did not have all data props or props of the wrong type: ",
    propTest.length
  );
  if (propTest.length > 0) {
    fs.writeFileSync(
      "./output/errors/failedPropsTestLog.json",
      JSON.stringify(propTest, null, 2)
    );
    console.log("Check error logs at: ./output/errors/failedPropsTestLog.json");
  }
  console.log(
    `Original length of the plz data set vs. merged data set (without updates):  ${PLZs.length}/${flatData.length}`
  );
  //  **************************************************************************************
  console.log("--");
  fs.writeFileSync(flatDataPath, JSON.stringify(flatData, null, 2));
  console.log(`Flat data written to ${flatDataPath}`);

  //--------------------------------------------------------------------------------------//
  //                                    Group-by AGS                                      //
  //--------------------------------------------------------------------------------------//

  // Groups the zip
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
      } = cur;
      const zipCodes = [cur.zipCode];
      acc.push({
        longitude,
        latitude,
        ags,
        name,
        zipCodes,
        district,
        state,
        population,
      });
    } else {
      acc[foundIndex].zipCodes.push(cur.zipCode);
    }

    return acc;
  }, []);

  fs.writeFileSync(outputPath, JSON.stringify(grouped));
  console.log(`Data written to ${outputPath}`);
};

mergeFiles();
