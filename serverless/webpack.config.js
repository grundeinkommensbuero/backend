const webpack = require('webpack');
const slsw = require('serverless-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

require('dotenv').config();

// taken from example
// (https://github.com/serverless-heaven/serverless-webpack/blob/master/examples/typescript/webpack.config.js)
const isLocal = slsw.lib.webpack.isLocal;

const functionsWithStaticFiles = [
  'createSignatureList',
  'adminCreateUser',
  'sendCongratulationMails',
  'sendVerificationMail',
  'sendReminderMails',
  'updateUser',
];

// We need this to only copy pdf files for the corresponding function.
// Based on https://github.com/serverless-heaven/serverless-webpack/issues/425
// We only copy the files for each corresponding function
const copyStaticFilesPlugin = () => ({
  apply: compiler => {
    // Get the module name off of the output path
    const moduleName = functionsWithStaticFiles.find(name =>
      compiler.options.output.path.includes(name)
    );

    if (moduleName) {
      new CopyWebpackPlugin([`**/${moduleName}/**/*.pdf`]).apply(compiler);
      new CopyWebpackPlugin([`**/${moduleName}/**/*.ttf`]).apply(compiler);
    }
  },
});

module.exports = {
  mode: isLocal ? 'development' : 'production',
  // You can let the plugin determine the correct handler entry points at build time
  entry: slsw.lib.entries,
  // Remove aws dependency because it is included in the lambdas anyway
  externals: [{ 'aws-sdk': 'commonjs aws-sdk' }],
  target: 'node',
  // Needed to use __dirname (https://stackoverflow.com/questions/41063214/reading-a-packaged-file-in-aws-lambda-package)
  node: {
    __dirname: false,
  },
  stats: 'errors-warnings', // less logging
  plugins: [
    copyStaticFilesPlugin(),
    // We also want to make some env variables available for config
    new webpack.DefinePlugin({
      // Needed to fix issue with Formidable pack (dependency of node-mailjet)
      'global.GENTLY': false,
      'process.env.IS_XBGE': JSON.stringify(process.env.IS_XBGE),
      'process.env.BASIC_AUTH_USERNAME': JSON.stringify(
        process.env.BASIC_AUTH_USERNAME
      ),
      'process.env.BASIC_AUTH_PASSWORD': JSON.stringify(
        process.env.BASIC_AUTH_PASSWORD
      ),
      'process.env.CONTENTFUL_ACCESS_TOKEN': JSON.stringify(
        process.env.CONTENTFUL_ACCESS_TOKEN
      ),
      'process.env.CONTENTFUL_SPACE_ID': JSON.stringify(
        process.env.CONTENTFUL_SPACE_ID
      ),
      'process.env.MAILJET_API_KEY': JSON.stringify(
        process.env.MAILJET_API_KEY
      ),
      'process.env.MAILJET_API_SECRET': JSON.stringify(
        process.env.MAILJET_API_SECRET
      ),
    }),
  ],
};
