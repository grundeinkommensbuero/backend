const randomBytes = require('crypto').randomBytes;

// Construct campaign identifier, so we know, from where the user comes
const constructCampaignId = campaignCode => {
  const campaign = {};
  if (typeof campaignCode !== 'undefined') {
    // we want to remove the last characters from the string (brandenburg-2 -> brandenburg)
    campaign.state = campaignCode.substring(0, campaignCode.length - 2);
    // ...and take the last char and save it as number
    campaign.round = parseInt(
      campaignCode.substring(campaignCode.length - 1, campaignCode.length),
      10
    );
    campaign.code = campaignCode;
  }
  return campaign;
};

const generateRandomId = length => {
  let result = '';
  const characters = '0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const getFileSuffix = contentType => {
  return contentType.split('/')[1];
};

const formatNumber = num => {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
};

// Generates a random string (e.g. for generating random password)
const getRandomString = length => {
  return randomBytes(length).toString('hex');
};

const roundTo = (number, factor) => {
  return Math.round(number / factor) * factor;
};

const STEPS = [
  { threshold: 20, roundTo: 1 },
  { threshold: 50, roundTo: 5 },
  { threshold: 150, roundTo: 10 },
  { threshold: 400, roundTo: 50 },
  { threshold: 4000, roundTo: 100 },
  { threshold: 10000, roundTo: 500 },
  { threshold: 40000, roundTo: 1000 },
  { threshold: 100000, roundTo: 5000 },
  { threshold: Infinity, roundTo: 10000 },
];

const prettifyNumber = number => {
  let pretty = number;
  const step = STEPS.find(x => number < x.threshold);
  pretty = roundTo(number, step.roundTo);
  return pretty;
};

const getMunicipalityGoal = (population, minGoal = 7, goalFactor = 0.01) => {
  let goal = population * goalFactor;
  goal = Math.max(minGoal, prettifyNumber(goal));
  return goal;
};

// Use the same validation as in frontend
const validateEmail = email => {
  // eslint-disable-next-line no-useless-escape
  const regex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(email.toLowerCase());
};

const validateZipCode = zipCode => {
  const regex = /\b\d{5}\b/g;
  return regex.test(zipCode.toString());
};

const validatePhoneNumber = phoneNumber => {
  const regex = /^[0-9]*$/g;
  return regex.test(phoneNumber);
};

// Strips input off any unwanted characters
const formatPhoneNumber = phoneNumber => {
  const string = phoneNumber.toString();

  // Replace (,),-,/ and space with emtpy string and replace + with 00
  return string.replace(new RegExp('[()/-\\s]', 'g'), '').replace('+', '00');
};

module.exports = {
  constructCampaignId,
  generateRandomId,
  getFileSuffix,
  formatNumber,
  getRandomString,
  getMunicipalityGoal,
  validateEmail,
  validateZipCode,
  validatePhoneNumber,
  formatPhoneNumber,
};
