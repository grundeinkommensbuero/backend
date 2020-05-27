const { getAllSignatureLists } = require('../../../shared/signatures');
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  let dateToCompare;

  // Get date from on to get history from query params
  if (event.queryStringParameters && event.queryStringParameters.date) {
    dateToCompare = new Date(event.queryStringParameters.date);
  } else {
    // Default should just be the last 4 weeks
    dateToCompare = new Date(new Date().getTime() - 28 * 24 * 60 * 60 * 1000);
  }

  console.log('dateToCompare', dateToCompare);

  const history = await getListDownloadsAndScansSinceDate(dateToCompare);

  return {
    statusCode: 200,
    headers: responseHeaders,
    isBase64Encoded: false,
    body: JSON.stringify({
      message: 'Successfully retrieved history of signature lists',
      history,
    }),
  };
};

const getListDownloadsAndScansSinceDate = async dateToCompare => {
  const signatureLists = await getAllSignatureLists();

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
        if (!(list.createdAt in stats[list.campaign.code].history)) {
          stats[list.campaign.code].history[list.createdAt] = {
            downloads: 0,
            received: 0,
            scans: { users: new Set() },
          };
        }

        stats[list.campaign.code].history[list.createdAt].downloads +=
          list.downloads;
      }
    }

    // Count scans

    if ('scannedByUser' in list) {
      for (let scan of list.scannedByUser) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);

        if (timestamp > dateToCompare) {
          const day = scan.timestamp.substring(0, 10);

          if (!(day in stats[list.campaign.code].history)) {
            stats[list.campaign.code].history[day] = {
              scans: { users: new Set() },
              received: 0,
              downloads: 0,
            };
          }

          stats[list.campaign.code].history[day].scans.users.add(scan.userId);
        }
      }
    }

    if ('received' in list) {
      for (let scan of list.received) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);

        if (timestamp > dateToCompare) {
          const day = scan.timestamp.substring(0, 10);

          if (!(day in stats[list.campaign.code].history)) {
            stats[list.campaign.code].history[day] = {
              scans: { users: new Set() },
              received: 0,
              downloads: 0,
            };
          }

          stats[list.campaign.code].history[day].received += scan.count;
        }
      }
    }
  }

  return cleanAndSortStats(stats);
};

const cleanAndSortStats = stats => {
  for (let campaign in stats) {
    const historyArray = [];

    // Transform the object into an array
    for (let day in stats[campaign].history) {
      const dayObject = {
        day,
      };

      if ('downloads' in stats[campaign].history[day]) {
        dayObject.downloads = stats[campaign].history[day].downloads;
      }

      if ('scans' in stats[campaign].history[day]) {
        dayObject.scans = stats[campaign].history[day].scans.users.size;
      }

      if ('received' in stats[campaign].history[day]) {
        dayObject.received = stats[campaign].history[day].received;
      }

      historyArray.push(dayObject);
    }

    // Sort the array (earliest first)
    historyArray.sort(
      (element1, element2) => new Date(element1.day) - new Date(element2.day)
    );

    stats[campaign] = historyArray;
  }

  return stats;
};
