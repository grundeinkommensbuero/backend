const CONFIG = require('../../config');

const tableName = CONFIG.PROD_SIGNATURES_TABLE_NAME;
const { getSignatureLists } = require('../../shared/signatures');

// eslint-disable-next-line no-unused-vars
const getListDownloadsSinceDate = async (date, campaignCode) => {
  const signatureLists = await getSignatureLists(tableName);

  const dateToCompare = Date.parse(date);
  const dailyDownloads = {};

  for (const list of signatureLists) {
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

// eslint-disable-next-line no-unused-vars
const getScansByUsersSinceDate = async (date, campaignCode) => {
  const signatureLists = await getSignatureLists(tableName);

  const dateToCompare = Date.parse(date);
  const dailyScans = {};

  for (const list of signatureLists) {
    console.log('checking list', list.id);
    if ('scannedByUser' in list && list.campaign.code === campaignCode) {
      for (const scan of list.scannedByUser) {
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

  for (const day in dailyScans) {
    if (Object.prototype.hasOwnProperty.call(dailyScans, day)) {
      console.log(day, dailyScans[day].users.size);
    }
  }
};

const getReceivedSignaturesSinceDate = async (date, campaignCode) => {
  const signatureLists = await getSignatureLists(tableName);

  const dateToCompare = Date.parse(date);
  const dailyReceivedSignatures = {};

  for (const list of signatureLists) {
    console.log('checking list', list.id);
    if ('received' in list && list.campaign.code === campaignCode) {
      for (const scan of list.received) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);
        if (timestamp > dateToCompare) {
          const day = scan.timestamp.substring(0, 10);
          if (!(day in dailyReceivedSignatures)) {
            dailyReceivedSignatures[day] = 0;
          }

          dailyReceivedSignatures[day] += scan.count;
        }
      }
    }
  }

  console.log(dailyReceivedSignatures);
};

// getListDownloadsSinceDate('05-20-2020', 'berlin-1');
// getScansByUsersSinceDate('05-18-2020', 'berlin-1');

getReceivedSignaturesSinceDate('04-25-2020', 'brandenburg-1');
