const data = require('./data').data;

const getStateByZipCode = zipCode => {
  const item = data.find(entry => zipCode.startsWith(entry.plz));
  if (typeof item !== 'undefined') {
    return item.bundesland;
  }

  return undefined;
};

const getZipCodeByCity = city => {
  const item = data.find(entry => city === entry.ort);
  if (typeof item !== 'undefined') {
    return item.plz.toString();
  }
  return undefined;
};
module.exports = { getStateByZipCode, getZipCodeByCity };
