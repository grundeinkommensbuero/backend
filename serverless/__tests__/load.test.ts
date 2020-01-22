import { step, TestSettings, Until, By } from '@flood/element';

export const settings: TestSettings = {
  clearCache: true,
  disableCache: true,
  screenshotOnFailure: true,
  actionDelay: 2,
};

export default () => {
  step('Create Pledge', async browser => {
    //Navigate to homepage.
    await browser.visit('https://dev.xbge.de/gemeinsam/');

    const randomNumber = generateRandomNumber();

    const randomEmail = `test${randomNumber}@expedition-grundeinkommen.de`;
    const randomUsername = `user${randomNumber}`;
    const zipCode = '12051';
    const city = 'Berlin';
    const message = 'Hallo, ich habe eine Frage an euch! Wie geht es euch so?';

    //Validate text
    let validation = By.visibleText('Gemeinsam zum staatlichen Modellversuch');
    await browser.wait(Until.elementIsVisible(validation));

    await browser.type(By.nameAttr('email'), randomEmail);
    await browser.type(By.nameAttr('name'), randomUsername);
    await browser.type(By.nameAttr('zipCode'), zipCode);
    await browser.type(By.nameAttr('city'), city);
    await browser.type(By.nameAttr('message'), message);

    await browser.click(By.css('.style-module--button--7HABh'));
  });
};

const generateRandomNumber = () => {
  return Math.floor(Math.random() * 1000000 + 1);
};
