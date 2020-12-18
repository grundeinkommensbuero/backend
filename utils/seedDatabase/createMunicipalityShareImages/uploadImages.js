const fs = require('fs');
const ProgressBar = require('progress');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ region: 'eu-central-1' });
const jimp = require('jimp');
const BUCKET_NAME = 'xbge-municipalities-images';

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

const uploadImages = async () => {
  for (let index = 0; index < municipalities.length; index++) {
    const municipality = municipalities[index];
    const img = await jimp.read(`./output/composite/${municipality.ags}.png`);
    const buffer = await img.getBufferAsync(jimp.MIME_PNG);
    try {
      await uploadImage(buffer, municipality.ags);
    } catch (err) {
      errors.push({ msg: 'Uploading image failed', municipality });
    }
    bar.tick();
  }
  fs.writeFileSync(
    './logs/error-composites.json',
    JSON.stringify(errors, null, 2)
  );
};

const uploadImage = (buffer, ags) => {
  const params = {
    Bucket: BUCKET_NAME,
    ACL: 'public-read',
    Key: `${ags}.png`,
    Body: buffer,
    ContentType: jimp.MIME_PNG,
  };

  return s3.upload(params).promise();
};

uploadImages();
