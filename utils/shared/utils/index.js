const randomBytes = require('crypto').randomBytes;

// Generates a random string (e.g. for generating random password)
module.exports.getRandomString = length => {
  return randomBytes(length).toString('hex');
};
