const { getAllSignatureLists } = require('../../../shared/signatures');

const getListDownloadsAndScansSinceDate = async date => {
  const signatureLists = await getAllSignatureLists(tableName);

  const dateToCompare = Date.parse(date);
  const stats = {};

  for (let list of signatureLists) {
    if (!(list.campaign.code in stats)) {
      stats[list.campaign.code] = {
        history: {},
      };
    }

    // Count downloads

    // Don't include lists from letter action
    if (!list.manually) {
      // we have to bring the date into the same format (UNIX time) as now
      const createdAt = Date.parse(list.createdAt);

      if (createdAt > dateToCompare) {
        if (!(list.createdAt in downloads)) {
          stats[list.campaign.code].history[list.createdAt] = {
            downloads: 0,
          };
        }

        stats[list.campaign.code].history[list.createdAt].downloads +=
          list.downloads;
      }
    }

    // Count scans

    if ('scannedByUser' in list && list.campaign.code === campaignCode) {
      for (let scan of list.scannedByUser) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);

        if (timestamp > dateToCompare) {
          const day = scan.timestamp.substring(0, 10);

          if (!(day in scans)) {
            stats[list.campaign.code].history[day].scans = {
              users: new Set(),
            };
          }

          stats[list.campaign.code].history[day].scans.users.add(scan.userId);
        }
      }
    }
  }

  console.log(downloads);
};

const cleanAndSortStats = stats => {
  for (let campaign in stats) {
    const historyArray = [];

    // Transform the object into an array
    for (let day in stats[campaign].history) {
      historyArray.push({
        day,
        downloads: stats[campaign].history[day].downloads,
        scans: stats[campaign].history[day].scans.users.size,
      });
    }
  }
};
