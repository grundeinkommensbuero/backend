const puppeteer = require('puppeteer');
const jimp = require('jimp');

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
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1200 });
  await page.goto(
    'https://5fc529cd40c2300007539f6c--expedition-grundeinkommen.netlify.app/playground/campaignMap'
  );
  await page.evaluate(() => {
    // TODO: update in frontend
    // const buttonsSelector = '#mapButtonContainer';
    const buttonsSelector =
      '#gatsby-focus-wrapper > main > div > section > div > div > div > div.style-module--interfaceContainer--1CH8m > div.style-module--buttonContainer--WINK5';
    let buttons = document.querySelector(buttonsSelector);
    buttons.style.display = 'none';
  });

  const mapSelector = '#deckgl-wrapper';
  await page.waitForSelector(mapSelector);
  const map = await page.$(mapSelector);
  await sleep(6000);
  const image = await map.screenshot();

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
