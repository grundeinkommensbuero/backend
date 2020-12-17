const gm = require('gm');
const fs = require('fs');

const municipalitiesRaw = fs.readFileSync(
  '../../analyseData/mergeGeospatialData/output/places.json',
  'utf8'
);
const municipalities = JSON.parse(municipalitiesRaw);

const drawText = municipality => {
  let pathToFile = `./output/backgrounds/${municipality.ags}.png`;
  gm(pathToFile)
    .fill('#fc484c')
    .font('./fonts/idealbold.ttf', 54) // I didn't wanted to play with fonts, so used normal default thing (:
    .drawText(100, 148, 'Wir holen das Grundeinkommen')
    .drawText(100, 212, `nach ${municipality.name}`)
    .write(`./output/composite/${municipality.ags}.png`, err => {
      if (err) return console.error(err);
      console.log(`${municipality.ags} done`);
    });
};

for (let index = 0; index < municipalities.length; index++) {
  const municipality = municipalities[index];
  drawText(municipality);
}
