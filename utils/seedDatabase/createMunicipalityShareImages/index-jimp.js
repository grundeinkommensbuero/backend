var Jimp = require('jimp');

const readTemplate = Jimp.read('./template/ogTemplate.png');
const readFont = Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
// Jimp.loadFont('./fonts/Ideal-Bold-54.fnt')

Promise.all([readTemplate, readFont])
  .then(([template, font]) => {
    Jimp.read('./municipalityImages/11000000.png')
      .then(overlay => {
        // Scale municipality image
        overlay.scaleToFit(180, 180, Jimp.RESIZE_BEZIER).rotate(5);
        // Compose and write text
        template
          .composite(
            overlay,
            880 - overlay.bitmap.width / 2,
            330 - overlay.bitmap.height / 2
          )
          .print(font, 100, 90, 'Wir holen das Grundeinkommen')
          .print(font, 100, 155, 'nach Berlin')
          .write('./output/test.png'); // save;
      })
      .catch(err => {
        throw err;
      });
  })
  .catch(err => {
    throw err;
  });
