// Get .default because of problems with webpack
// https://github.com/bitinn/node-fetch/issues/450
const fetch = require('node-fetch').default;
const { accessToken, spaceId } = require('./contentfulConfig');
const campaigns = {
  'schleswig-holstein-1': 'JH4OhoEW7AMcnrL6zLhXu',
  'brandenburg-1': 'JrA0oRRv0IvBq6KFR0HAY',
  'hamburg-1': '5Lit4YciGc6MxsIJ6M4aNI',
  'berlin-1': '6oq0POf8UcRLZs4kzyQd49',
  'bremen-1': '6BgXlAhocgSwZGozhJEqmn',
};

module.exports.getSignatureCountFromContentful = async () => {
  const params = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  const contentfulCounts = {};

  // Get the signature counts from contentful for each campaign
  for (let campaign in campaigns) {
    //make api call to contentful to get the current signature count
    const result = await fetch(
      `https://cdn.contentful.com/spaces/${spaceId}/entries/${campaigns[campaign]}`,
      params
    );

    //parse result to json
    const json = await result.json();

    contentfulCounts[campaign] = {
      minimum: json.fields.minimum,
      addToSignatureCount: json.fields.addToSignatureCount,
    };
  }

  return contentfulCounts;
};
