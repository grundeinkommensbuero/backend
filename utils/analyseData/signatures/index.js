const tableName = 'prod-signatures';
const { getSignatureLists } = require('../../shared/signatures');

const getListDownloadsSinceDate = async (date, campaignCode) => {
  const signatureLists = await getSignatureLists(tableName);

  const dateToCompare = Date.parse(date);
  const dailyDownloads = {};

  for (let list of signatureLists) {
    // Don't include lists from letter action
    if (!list.manually && list.campaign.code === campaignCode) {
      // we have to bring the date into the same format (UNIX time) as now
      const createdAt = Date.parse(list.createdAt);

      if (createdAt > dateToCompare) {
        if (!(list.createdAt in dailyDownloads)) {
          dailyDownloads[list.createdAt] = 0;
        }

        dailyDownloads[list.createdAt] += list.downloads;
      }
    }
  }

  console.log(dailyDownloads);
};

const getScansByUsersSinceDate = async (date, campaignCode) => {
  const signatureLists = await getSignatureLists(tableName);

  const dateToCompare = Date.parse(date);
  const dailyScans = {};

  for (let list of signatureLists) {
    console.log('checking list', list.id);
    if ('scannedByUser' in list && list.campaign.code === campaignCode) {
      for (let scan of list.scannedByUser) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);
        if (timestamp > dateToCompare) {
          const day = scan.timestamp.substring(0, 10);
          if (!(day in dailyScans)) {
            dailyScans[day] = { users: new Set() };
          }

          dailyScans[day].users.add(scan.userId);
        }
      }
    }
  }

  console.log(dailyScans);

  for (let day in dailyScans) {
    console.log(day, dailyScans[day].users.size);
  }
};

// getListDownloadsSinceDate('04-16-2020', 'berlin-1');
getScansByUsersSinceDate('04-16-2020', 'berlin-1');
