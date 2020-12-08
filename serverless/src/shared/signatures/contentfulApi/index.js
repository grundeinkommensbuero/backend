// Get .default because of problems with webpack
// https://github.com/bitinn/node-fetch/issues/450
const fetch = require('node-fetch').default;
const Configstore = require('configstore');
const packageJson = require('../../../../package.json');

const config = new Configstore(packageJson.name);
let accessToken;
let spaceId;

// Contentful config should either be passed through a config file
// or should have been set via config store
const localContentfulConfig = require('../../../../contentfulConfig');

if (!localContentfulConfig.accessToken || !localContentfulConfig.spaceId) {
  accessToken = localContentfulConfig.accessToken;
  spaceId = localContentfulConfig.spaceId;
} else {
  console.log(
    'No contentful config overwrite provided, checking for global config...'
  );

  const globalContentfulConfig = config.get('contentful');

  if (!globalContentfulConfig) {
    console.log('No global contentful config provided');
  } else {
    accessToken = globalContentfulConfig.accessToken;
    spaceId = globalContentfulConfig.spaceId;
  }
}

const campaigns = {
  'schleswig-holstein-1': 'JH4OhoEW7AMcnrL6zLhXu',
  'brandenburg-1': 'JrA0oRRv0IvBq6KFR0HAY',
  'hamburg-1': '5Lit4YciGc6MxsIJ6M4aNI',
  'berlin-1': '48SFq6zs6sIdUs1APadYmm',
  'bremen-1': '6BgXlAhocgSwZGozhJEqmn',
};
const requestParams = {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
};

module.exports.getSignatureCountFromContentful = async () => {
  if (!accessToken || !spaceId) {
    console.log('Access token or space id not provided');
    return {};
  }

  const contentfulCounts = {};

  // Get the signature counts from contentful for each campaign
  const promises = [];

  for (const campaign in campaigns) {
    if (Object.prototype.hasOwnProperty.call(campaigns, campaign)) {
      promises.push(makeApiCall(campaign, contentfulCounts));
    }
  }

  await Promise.all(promises);

  return contentfulCounts;
};

const makeApiCall = async (campaign, contentfulCounts) => {
  // add api call to contentful to get the current signature count to promises
  const result = await fetch(
    `https://cdn.contentful.com/spaces/${spaceId}/entries/${campaigns[campaign]}`,
    requestParams
  );

  // parse result to json
  const json = await result.json();

  contentfulCounts[campaign] = {
    minimum: json.fields.minimum,
    addToSignatureCount: json.fields.addToSignatureCount,
  };
};
