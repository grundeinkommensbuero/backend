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

const getCityByZipCode = zipCode => {
  console.log('zip code', zipCode);
  const item = data.find(entry => zipCode.startsWith(entry.plz));

  if (typeof item !== 'undefined') {
    return item.ort;
  }
  return undefined;
};

module.exports = { getStateByZipCode, getZipCodeByCity, getCityByZipCode };
