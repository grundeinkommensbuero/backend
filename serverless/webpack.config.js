const slsw = require('serverless-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// taken from example
// (https://github.com/serverless-heaven/serverless-webpack/blob/master/examples/typescript/webpack.config.js)
const isLocal = slsw.lib.webpack.isLocal;

module.exports = {
  mode: isLocal ? 'development' : 'production',
  // You can let the plugin determine the correct handler entry points at build time
  entry: slsw.lib.entries,
  target: 'node',
  stats: 'errors-warnings', // less logging
  plugins: [new CopyWebpackPlugin(['**/*.html', '**/*.pdf'])],
};
