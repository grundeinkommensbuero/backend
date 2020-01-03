// Get .default because of problems with webpack
// https://github.com/bitinn/node-fetch/issues/450
const fetch = require('node-fetch').default;
const { accessToken, spaceId } = require('./contentfulConfig');
const campaign = 'JH4OhoEW7AMcnrL6zLhXu';

module.exports.getSignatureCountFromContentful = async () => {
  const params = {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  };

  //make api call to contentful to get the current signature count
  const result = await fetch(
    `https://cdn.contentful.com/spaces/${spaceId}/entries/${campaign}`,
    params
  );

  //parse result to json
  const json = await result.json();

  return json.fields.minimum;
};
