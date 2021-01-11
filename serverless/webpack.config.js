const webpack = require('webpack');
const slsw = require('serverless-webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

require('dotenv').config();

// taken from example
// (https://github.com/serverless-heaven/serverless-webpack/blob/master/examples/typescript/webpack.config.js)
const isLocal = slsw.lib.webpack.isLocal;

const functionsWithPdf = [
  'createSignatureList',
  'sendReminderMails',
  'updateUser',
];

const functionsWithTtf = ['updateUser'];

// We need this to only copy pdf (or other files) files for the corresponding function.
// Based on https://github.com/serverless-heaven/serverless-webpack/issues/425
// We only copy the files for each corresponding function
const copyStaticFilesPlugin = () => ({
  apply: compiler => {
    // Get the module name off of the output path
    const moduleWithPdf = functionsWithPdf.find(name =>
      compiler.options.output.path.includes(name)
    );

    if (moduleWithPdf) {
      // We need to define the output path here, because since I moved the pdfs
      // outside of the functions to reuse them it is a bit more difficult to
      // copy them into the correct folder of the corresponding function
      let outputPath;
      // same for createSignatureListAuth and createSignatureList because they
      // use the same index file
      if (moduleWithPdf === 'createSignatureList') {
        outputPath = 'src/api/signatures/createSignatureList/pdfs';
      } else if (moduleWithPdf === 'sendReminderMails') {
        outputPath = 'src/triggers/sendReminderMails/pdfs';
      } else {
        // For other functions with pdfs (but inside the function folder),
        // we also want to copy them
        new CopyWebpackPlugin({
          patterns: [`**/${moduleWithPdf}/**/*.pdf`],
        }).apply(compiler);
      }

      new CopyWebpackPlugin({
        patterns: [{ from: 'pdfs', to: outputPath }],
      }).apply(compiler);
    }

    // Same for ttf
    const moduleWithTtf = functionsWithTtf.find(name =>
      compiler.options.output.path.includes(name)
    );

    if (moduleWithTtf) {
      new CopyWebpackPlugin({
        patterns: [`**/${moduleWithTtf}/**/*.ttf`],
      }).apply(compiler);
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
  module: {
    rules: [
      {
        test: /\.(pdf)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
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
      'process.env.QUERY_TOKEN': JSON.stringify(process.env.QUERY_TOKEN),
    }),
  ],
};
