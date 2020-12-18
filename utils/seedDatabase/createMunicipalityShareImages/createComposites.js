const gm = require('gm');
const fs = require('fs');
const ProgressBar = require('progress');

const errors = [];

const municipalitiesRaw = fs.readFileSync(
  '../../analyseData/mergeGeospatialData/output/places.json',
  'utf8'
);
const municipalities = JSON.parse(municipalitiesRaw);

const bar = new ProgressBar(
  'Processing texts: [:bar] :current/:total = :percent, elapsed :elapsed s, rate :rate images/second, eta :eta s',
  { total: municipalities.length }
);

const drawText = municipality => {
  return new Promise((resolve, reject) => {
    let pathToFile = `./output/backgrounds/${municipality.ags}.png`;
    gm(pathToFile)
      .fill('#fc484c')
      .font('./fonts/idealbold.ttf', 54) // I didn't wanted to play with fonts, so used normal default thing (:
      .drawText(100, 148, 'Wir holen das Grundeinkommen')
      .drawText(100, 212, `nach ${municipality.name}`)
      .write(`./output/composite/${municipality.ags}.png`, err => {
        if (err) {
          reject('gm write error: ' + municipality.ags + err);
          errors.push({
            municipality,
            err,
            msg: 'Some other fs stat error',
          });
        } else {
          resolve(`${municipality.ags} done`);
        }
      });
  });
};

const createComposite = async () => {
  for (let index = 0; index < municipalities.length; index++) {
    const municipality = municipalities[index];
    await drawText(municipality);
    bar.tick();
  }
  fs.writeFileSync(
    './logs/error-composites.json',
    JSON.stringify(errors, null, 2)
  );
};

createComposite();
