// Get .default because of problems with webpack
// https://github.com/bitinn/node-fetch/issues/450
const fetch = require('node-fetch').default;
const { accessToken, spaceId } = require('../../../../contentfulConfig');

const campaigns = {
  'schleswig-holstein-1': 'JH4OhoEW7AMcnrL6zLhXu',
  'brandenburg-1': 'JrA0oRRv0IvBq6KFR0HAY',
  'hamburg-1': '5Lit4YciGc6MxsIJ6M4aNI',
  'berlin-1': '48SFq6zs6sIdUs1APadYmm',
  'berlin-2': 'UhoaMuq6ePPH7iSsb0Kyj',
  'bremen-1': '6BgXlAhocgSwZGozhJEqmn',
};
const requestParams = {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
};

module.exports.getSignatureCountFromContentful = async () => {
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

  if ('fields' in json) {
    contentfulCounts[campaign] = {
      minimum: json.fields.minimum,
      addToSignatureCount: json.fields.addToSignatureCount,
    };
  }
};
