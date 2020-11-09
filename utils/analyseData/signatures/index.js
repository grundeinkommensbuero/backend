const { getUser } = require('../../shared/users/getUsers');
const CONFIG = require('../../config');

const signaturesTableName = CONFIG.PROD_SIGNATURES_TABLE_NAME;
const usersTableName = CONFIG.PROD_USERS_TABLE_NAME;

const { getSignatureLists } = require('../../shared/signatures');

// eslint-disable-next-line no-unused-vars
const getListDownloadsSinceDate = async (date, campaignCode) => {
  const signatureLists = await getSignatureLists(signaturesTableName);

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
  const signatureLists = await getSignatureLists(signaturesTableName);

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

const getReceivedSignaturesSinceDate = async (
  startDate,
  endDate,
  campaignCode
) => {
  const signatureLists = await getSignatureLists(signaturesTableName);

  const dailyReceivedSignatures = {};

  const users = [];

  for (const list of signatureLists) {
    let receivedListInTimespan = false;

    if ('received' in list && list.campaign.code === campaignCode) {
      for (const scan of list.received) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);
        if (
          timestamp > Date.parse(startDate) &&
          timestamp < Date.parse(endDate)
        ) {
          const day = scan.timestamp.substring(0, 10);
          if (!(day in dailyReceivedSignatures)) {
            dailyReceivedSignatures[day] = 0;
          }

          dailyReceivedSignatures[day] += scan.count;
          receivedListInTimespan = true;
        }
      }

      if (receivedListInTimespan) {
        if (list.userId !== 'anonymous') {
          console.log('user id', list.userId);
          const result = await getUser(usersTableName, list.userId);

          if ('Item' in result) {
            users.push(result.Item.email);
          }
        }
      }
    }
  }

  console.log(dailyReceivedSignatures);
  console.log('users length', users.length);
  for (const user of users) {
    console.log(user);
  }
};

// getListDownloadsSinceDate('05-20-2020', 'berlin-1');
// getScansByUsersSinceDate('05-18-2020', 'berlin-1');

getReceivedSignaturesSinceDate('04-14-2020', '05-08-2020', 'berlin-1');
