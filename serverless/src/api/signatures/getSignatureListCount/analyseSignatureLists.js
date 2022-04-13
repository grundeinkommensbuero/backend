const { getAllSignatureLists } = require('../../../shared/signatures');

module.exports.analyseSignatureLists = async () => {
  const signatureLists = await getAllSignatureLists();
  const stats = {};

  // loop through lists to compute stats
  for (const list of signatureLists) {
    if (!list.fakeScannedByUser && !list.manually) {
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
          userCount: 0,
          users: [],
        };
      }

      if (list.userId === 'anonymous') {
        stats[campaign].anonymous.lists++;
        stats[campaign].anonymous.downloads += list.downloads;
      } else {
        stats[campaign].byUser.lists++;
        stats[campaign].byUser.downloads += list.downloads;

        if (!stats[campaign].users.includes(list.userId)) {
          stats[campaign].userCount++;
          stats[campaign].users.push(list.userId);
        }
      }

      stats[campaign].total.lists++;
      stats[campaign].total.downloads += list.downloads;
    }
  }

  // Remove users array for every campaign
  for (const campaign in stats) {
    if (Object.prototype.hasOwnProperty.call(stats, campaign)) {
      delete stats[campaign].users;
    }
  }

  return stats;
};
