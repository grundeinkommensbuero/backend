const fs = require('fs');
const gm = require('gm');

const municipalitiesRaw = fs.readFileSync(
  '../../analyseData/mergeGeospatialData/output/places.json',
  'utf8'
);
const municipalities = JSON.parse(municipalitiesRaw);

console.log(municipalities[0]);

// gm('./template/ogTemplateWithPlaceholders.png')
//   .composite('./municipalityImages/11000000.png')
//   .geometry('+10+50')
//   .write('./output/test.png', function (err) {
//     if (!err) {
//       console.log('done');
//     } else {
//       console.log(err);
//     }
//   });

// gm()
//   .in('-page', '+0+0')
//   .in('./template/ogTemplateWithPlaceholders.png')
//   .in('-page', '160x180+792+250')
//   .in('./municipalityImages/11000000.png')
//   .mosaic()
//   .write('./output/test.png', function (err) {
//     if (!err) {
//       console.log('done');
//     } else {
//       console.log(err);
//     }
//   });

// var exec = require('child_process').exec;

// var command = [
//   'composite',
//   '-geometry',
//   '160x180+790+250',
//   '-rotate',
//   '-5',
//   '-quality',
//   100,
//   './municipalityImages/11000000.png',
//   './template/ogTemplateWithPlaceholders.png', //input
//   './output/test.png', //output
// ];
// // making watermark through exec - child_process
// exec('gm ' + command.join(' '), function (err, stdout, stderr) {
//   if (err) console.log(err);
// });

var exec = require('child_process').exec;

var command = [
  'convert',
  './template/ogTemplateWithPlaceholders.png', //background
  './municipalityImages/11000000.png', //overlay
  '-rotate',
  '-5',
  '-geometry',
  '180x180+792+250',

  //   '-gravity',
  //   'center',
  '-composite',
  './output/test.png', //output
];
// making watermark through exec - child_process
exec('magick ' + command.join(' '), function (err, stdout, stderr) {
  if (err) console.log(err);
});
