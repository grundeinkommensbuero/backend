const puppeteer = require('puppeteer');
const fs = require('fs');

const sleep = ms => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function run() {
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
  await map.screenshot({ path: './output/map.png' });

  browser.close();
}

run();
