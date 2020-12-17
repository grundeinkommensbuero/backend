const fs = require('fs');
const Jimp = require('jimp');

const municipalitiesRaw = fs.readFileSync(
  '../../analyseData/mergeGeospatialData/output/places.json',
  'utf8'
);
const municipalities = JSON.parse(municipalitiesRaw);

const generateBackground = (pathToTemplate, isGeneric, municipality) => {
  Jimp.read(pathToTemplate)
    .then(template => {
      if (isGeneric) {
        template.write(`./output/backgrounds/${municipality.ags}.png`, () => {
          console.log(`${municipality.ags} done`);
        });
      } else {
        Jimp.read(`./municipalityImages/${municipality.ags}.png`)
          .then(overlay => {
            // Scale municipality image
            overlay.rotate(5).scaleToFit(180, 180, Jimp.RESIZE_BEZIER);
            // Compose
            template
              .composite(
                overlay,
                880 - overlay.bitmap.width / 2,
                330 - overlay.bitmap.height / 2
              )
              .write(`./output/backgrounds/${municipality.ags}.png`, () => {
                console.log(`${municipality.ags} done`);
              }); // save;
          })
          .catch(err => {
            console.log('Error reading overlay', err);
          });
      }
    })
    .catch(err => {
      console.log('Error reading template', err);
    });
};

for (let index = 0; index < municipalities.length; index++) {
  const municipality = municipalities[index];
  fs.stat(`./municipalityImages/${municipality.ags}.png`, function (err, stat) {
    if (err == null) {
      generateBackground('./template/ogTemplate.png', false, municipality);
    } else if (err.code === 'ENOENT') {
      // file does not exist
      generateBackground(
        './template/ogTemplateGeneric.png',
        true,
        municipality
      );
    } else {
      console.log('fs stat error: ', err.code);
    }
  });
}
