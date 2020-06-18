const { getAllSignatureLists } = require('../../../shared/signatures');

module.exports.analyseSignatureLists = async () => {
  const signatureLists = await getAllSignatureLists();
  const stats = {};

  // loop through lists to compute stats
  for (const list of signatureLists) {
    if (!list.fakeScannedByUser) {
      const campaign = list.campaign.code;

      // check if campaign is already in stats
      if (!(campaign in stats)) {
        // initialize object for this campaign
        stats[campaign] = {
          total: {
            lists: 0,
            downloads: 0,
          },
          anonymous: {
            lists: 0,
            downloads: 0,
          },
          byUser: {
            lists: 0,
            downloads: 0,
          },
        };
      }

      if (list.userId === 'anonymous') {
        stats[campaign].anonymous.lists++;
        stats[campaign].anonymous.downloads += list.downloads;
      } else {
        stats[campaign].byUser.lists++;
        stats[campaign].byUser.downloads += list.downloads;
      }

      stats[campaign].total.lists++;
      stats[campaign].total.downloads += list.downloads;
    }
  }

  return stats;
};
