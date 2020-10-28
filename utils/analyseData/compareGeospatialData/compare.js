const fs = require("fs");
const csv = require("csv-parser");
const createCsvWriter = require("csv-writer").createObjectCsvWriter;

// ---- Utils ----------------------------------------------------------------------------

const extraLogs = false;

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

const getSet = (arr, prop) => {
  return [...new Set(arr.map((x) => x[prop]))];
};
const getUniquePropLength = (arr, prop) => {
  return getSet(arr, prop).length;
};

//--------------------------------------------------------------------------------------//
//                                      Comparison                                      //
//--------------------------------------------------------------------------------------//
// Paths to compare
const PLZPath = "zuordnung_plz_ort_landkreis.csv";
const gemeindePath = "gemeinden_simplify200.geojson";

// Read and parse those files
const readFiles = async () => {
  const PLZs = await readCSV(PLZPath);
  const raw = fs.readFileSync(gemeindePath, "utf8");
  const gemeinden = JSON.parse(raw).features;
  return { PLZs, gemeinden };
};

const compareFiles = async () => {
  const { PLZs, gemeinden } = await readFiles();

  // Exclude the feature geometry
  const gemeindenProps = gemeinden.map((x) => x.properties);
  if (extraLogs) {
    console.log("Example gemeindenProps: ", gemeindenProps[0]);
    console.log("Example PLZs: ", PLZs[0]);
  }

  // Compare lengths
  const gemeindenLength = getUniquePropLength(gemeindenProps, "AGS");
  const plzLength = getUniquePropLength(PLZs, "ags");
  console.log("Gemeinden length: ", gemeinden.length);
  console.log("Unique AGS Gemeinden length: ", gemeindenLength);
  console.log("Unique AGS PLZ length: ", plzLength);

  // ---- Compare AGS Sets -----------------------------------------------------------------
  const gemeindenSet = getSet(gemeindenProps, "AGS");
  const plzSet = getSet(PLZs, "ags");

  // isSubset?
  const isPLZSubsetOfGemeinden = plzSet.every((x) => gemeindenSet.includes(x));
  console.log("PLZs AGS is subset of gemeinden AGS: ", isPLZSubsetOfGemeinden);

  // AGS that are not in gemeindenSet
  const notMatchingAGS = plzSet.filter((x) => !gemeindenSet.includes(x));
  console.log("PLZs AGS that are not in gemeinden", notMatchingAGS.length);

  // Match back to PLZs
  const plzNotInGemeinden = notMatchingAGS.map((x) =>
    PLZs.find((y) => y.ags === x)
  );

  // Compare by Name
  const matchMissingByName = plzNotInGemeinden
    .map((x) => gemeindenProps.find((y) => y.GEN === x.ort))
    .filter((x) => !!x);
  console.log("Matched missing AGS by name: ", matchMissingByName.length);

  // ---- Write out communities that are missing in the gemeindenSet ---------------------------
  // To csv for a table
  const csvWriter = createCsvWriter({
    path: "not-matching-plzs.csv",
    header: [
      { id: "ags", title: "AGS" },
      { id: "ort", title: "Name" },
      { id: "plz", title: "PLZ" },
      { id: "bundesland", title: "Bundesland" },
    ],
  });
  csvWriter.writeRecords(plzNotInGemeinden);

  // JSON if prefered
  if (extraLogs) {
    fs.writeFileSync(
      "not-matching-plzs.json",
      JSON.stringify(plzNotInGemeinden, null, 2)
    );
  }
};

compareFiles();
