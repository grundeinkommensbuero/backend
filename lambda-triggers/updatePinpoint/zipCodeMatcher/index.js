const data = require('./data').data;

const getStateByZipCode = zipCode => {
  const item = data.find(entry => zipCode.startsWith(entry.plz));
  if (item !== undefined) {
    return item.bundesland;
  } else {
    return 'undefined';
  }
};

module.exports = { getStateByZipCode };
