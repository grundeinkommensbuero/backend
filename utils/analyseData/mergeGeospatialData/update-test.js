const fs = require("fs");
const outputPath = "./output/logs/flatData.json";

const raw = fs.readFileSync(outputPath, "utf8");
const flatData = JSON.parse(raw);
const updateRaw = fs.readFileSync("./data/exampleUpdateData.json", "utf8");
const updateData = JSON.parse(updateRaw);

const dataToAdd = updateData
  .filter((x) => x.add)
  .map((x) => {
    const { add, ...rest } = x;
    return rest;
  });

const dataToReplace = updateData.filter(
  (x) => x.replace && x.replace.length > 0
);

let replaceIndexes = [];
dataToReplace.forEach((e) => {
  const { replace, replaceBy } = e;
  replaceIndexes = flatData.reduce((acc, cur, i) => {
    if (cur[replaceBy] === e[replaceBy]) {
      acc.push(i);
    }
    return acc;
  }, []);
  replace.forEach((r) => {
    replaceIndexes.forEach((index) => {
      flatData[index][r] = e[r];
    });
  });
});

console.log(flatData[replaceIndexes[0]]);
