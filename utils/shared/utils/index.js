const randomBytes = require('crypto').randomBytes;

// Generates a random string (e.g. for generating random password)
module.exports.getRandomString = length => {
  return randomBytes(length).toString('hex');
};

// Transforms date from e.g. 13.02.2020 00:52:51 to 02.13.2020 00:52:51
module.exports.transformDate = date => {
  const dateArray = date.split('.');
  return `${dateArray[1]}.${dateArray[0]}.${dateArray[2]}`;
};
