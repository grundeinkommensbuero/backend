const slsw = require('serverless-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

// taken from example
// (https://github.com/serverless-heaven/serverless-webpack/blob/master/examples/typescript/webpack.config.js)
const isLocal = slsw.lib.webpack.isLocal;

const functionsWithStaticFiles = [
  'createSignatureList',
  'adminCreateUser',
  'sendCongratulationMails',
  'sendVerificationMail',
];

// We need this to only copy html and pdf files for the corresponding function.
// Based on https://github.com/serverless-heaven/serverless-webpack/issues/425
// We only copy the files for each corresponding function
const CopyStaticFilesPlugin = () => ({
  apply: compiler => {
    // Get the module name off of the output path
    const moduleName = functionsWithStaticFiles.find(moduleName =>
      compiler.options.output.path.includes(moduleName)
    );

    if (moduleName) {
      console.log('module has static file dependencies:', moduleName);
      new CopyWebpackPlugin([
        `**/${moduleName}/mailTemplate.html`,
        `**/${moduleName}/**/*.pdf`,
      ]).apply(compiler);
    } else {
    }
  },
});

module.exports = {
  mode: isLocal ? 'development' : 'production',
  // You can let the plugin determine the correct handler entry points at build time
  entry: slsw.lib.entries,
  target: 'node',
  stats: 'errors-warnings', // less logging
  plugins: [CopyStaticFilesPlugin()],
};
