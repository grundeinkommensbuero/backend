const chromium = require('chrome-aws-lambda');
const jimp = require('jimp');
const AWS = require('aws-sdk');

const s3 = new AWS.S3({ region: 'eu-central-1' });
const url = 'https://expedition-grundeinkommen.de/playground/campaignMap';

module.exports.handler = async event => {
  // Use puppeteer to take screenshot of map
  const image = await takeScreenshot();

  const timestamp = new Date().toISOString();
  // Save screenshot in two different files (one with timestamp as file name)
  // the other one is the current map and is always overwritten
  await Promise.all([
    uploadImage(image, 'municipalityMap'),
    uploadImage(image, `municipalityMap_${timestamp}`),
  ]);

  return event;
};

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function takeScreenshot() {
  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  });
  console.log({ browser });
  const page = await browser.newPage();
  console.log('created page', page);

  await page.goto(url);
  console.log('went to page', page);
  await page.evaluate(() => {
    // NOTE: Selector will be the id in production
    // const buttonsSelector ='#mapButtonContainer'

    const buttonsSelector = '#mapButtonContainer';

    const buttons = document.querySelector(buttonsSelector);
    buttons.style.display = 'none';
  });
  console.log({ page });

  const mapSelector = '#deckgl-wrapper';
  await page.waitForSelector(mapSelector);
  const map = await page.$(mapSelector);
  console.log({ map });
  await sleep(100);
  const image = await map.screenshot();
  console.log({ image });

  browser.close();

  return image;
}

const uploadImage = (buffer, fileName) => {
  const params = {
    Bucket: process.env.MAP_IMAGE_BUCKET,
    ACL: 'public-read',
    Key: `${fileName}.png`,
    Body: buffer,
    ContentType: jimp.MIME_PNG,
  };

  return s3.upload(params).promise();
};
