import { step, TestSettings, Until, By } from '@flood/element';

export const settings: TestSettings = {
  clearCache: true,
  disableCache: true,
  screenshotOnFailure: true,
};

export default () => {
  step('Home', async browser => {
    //Navigate to homepage.
    await browser.visit('https://expedition-grundeinkommen.de');

    //Validate text
    let validation = By.visibleText('Unsere Expeditions-Etappen');
    await browser.wait(Until.elementIsVisible(validation));
  });
};
