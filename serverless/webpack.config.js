const slsw = require('serverless-webpack');

module.exports = {
  // You can let the plugin determine the correct handler entry points at build time
  entry: slsw.lib.entries,
  target: 'node',
};
