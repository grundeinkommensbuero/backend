// NOTES:
// This script takes several hours to complete
// for the 10,830 municipalities
// Possible Improvements
// - Check if image exists and skip existing images
//    – include flag for overwrite
const fs = require('fs');
const Jimp = require('jimp');
const fsPromises = fs.promises;
const ProgressBar = require('progress');

const errors = [];

const municipalitiesRaw = fs.readFileSync(
  '../../analyseData/mergeGeospatialData/output/places.json',
  'utf8'
);
const municipalities = JSON.parse(municipalitiesRaw);

const bar = new ProgressBar(
  'Processing backgrounds: [:bar] :current/:total = :percent, elapsed :elapsed s, rate :rate images/second, eta :eta s',
  { total: municipalities.length }
);

const generateGenericBackground = municipality => {
  return new Promise((resolve, reject) => {
    Jimp.read('./template/ogTemplateGeneric.png')
      .then(template => {
        template.write(`./output/backgrounds/${municipality.ags}.png`, () => {
          resolve(`${municipality.ags} done`);
        });
      })
      .catch(err => {
        reject('Error reading template', err);
        errors.push({
          municipality,
          err,
          msg: 'Error reading generic template',
        });
      });
  });
};

const generateSpecificBackground = municipality => {
  return new Promise((resolve, reject) => {
    Jimp.read('./template/ogTemplate.png')
      .then(template => {
        template.write(`./output/backgrounds/${municipality.ags}.png`, () => {
          resolve(`${municipality.ags} done`);
        });

        Jimp.read(`./municipalityImages/${municipality.ags}.png`)
          .then(overlay => {
            // Rotate first! and then scale municipality image
            overlay.rotate(5).scaleToFit(180, 180, Jimp.RESIZE_BEZIER);
            // Compose
            template
              .composite(
                overlay,
                880 - overlay.bitmap.width / 2,
                330 - overlay.bitmap.height / 2
              )
              .write(`./output/backgrounds/${municipality.ags}.png`, () => {
                resolve(`${municipality.ags} done`);
              }); // save;
          })
          .catch(err => {
            reject('Error reading overlay', err);
            errors.push({
              municipality,
              err,
              msg: 'Error reading municipality overlay',
            });
          });
      })
      .catch(err => {
        reject('Error reading template', err);
        errors.push({
          municipality,
          err,
          msg: 'Error reading municipality template',
        });
      });
  });
};

const createBackgrounds = async () => {
  for (let index = 0; index < municipalities.length; index++) {
    const municipality = municipalities[index];
    try {
      await fsPromises.stat(`./municipalityImages/${municipality.ags}.png`);
      await generateSpecificBackground(municipality);
    } catch (err) {
      if ((err.code = 'ENOENT')) {
        await generateGenericBackground(municipality);
      } else {
        console.log('fs stat error', municipality.ags, err);
        errors.push({
          municipality,
          err,
          msg: 'Some other fs stat error',
        });
      }
    }
    bar.tick();
  }
  fs.writeFileSync(
    './logs/error-backgrounds.json',
    JSON.stringify(errors, null, 2)
  );
};

createBackgrounds();
