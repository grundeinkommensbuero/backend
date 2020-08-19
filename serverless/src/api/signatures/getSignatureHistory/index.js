const { getAllSignatureLists } = require('../../../shared/signatures');
const { errorResponse } = require('../../../shared/apiResponse');

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    let startDate;
    let endDate;

    // Get date from on to get history from query params
    if (event.queryStringParameters && event.queryStringParameters.start) {
      startDate = new Date(event.queryStringParameters.start);
    } else {
      // Default should just be the last 6 weeks
      startDate = new Date(new Date().getTime() - 6 * 7 * 24 * 60 * 60 * 1000);
    }

    if (event.queryStringParameters && event.queryStringParameters.end) {
      endDate = new Date(event.queryStringParameters.end);
    } else {
      // Default should just be now
      endDate = new Date();
    }

    const history = await getListDownloadsAndScansForTimespan(
      startDate,
      endDate
    );

    return {
      statusCode: 200,
      headers: responseHeaders,
      isBase64Encoded: false,
      body: JSON.stringify({
        message: 'Successfully retrieved history of signature lists',
        history,
      }),
    };
  } catch (error) {
    console.log('error while getting signature history', error);
    return errorResponse(500, 'Error while getting signature history', error);
  }
};

const getListDownloadsAndScansForTimespan = async (startDate, endDate) => {
  const signatureLists = await getAllSignatureLists();

  const stats = {};

  for (const list of signatureLists) {
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

      if (createdAt > startDate && createdAt < endDate) {
        if (!(list.createdAt in stats[list.campaign.code].history)) {
          stats[list.campaign.code].history[list.createdAt] = {
            downloads: 0,
            received: 0,
            scannedLists: new Set(),
            scanned: 0,
            usersWhoScanned: new Set(),
          };
        }

        stats[list.campaign.code].history[list.createdAt].downloads +=
          list.downloads;
      }
    }

    // Count scans

    if ('scannedByUser' in list) {
      for (const scan of list.scannedByUser) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);

        if (timestamp > startDate && timestamp < endDate) {
          const day = scan.timestamp.substring(0, 10);

          if (!(day in stats[list.campaign.code].history)) {
            stats[list.campaign.code].history[day] = {
              usersWhoScanned: new Set(),
              received: 0,
              downloads: 0,
              scanned: 0,
              scannedLists: new Set(),
            };
          }

          stats[list.campaign.code].history[day].usersWhoScanned.add(
            scan.userId
          );

          stats[list.campaign.code].history[day].scannedLists.add(list.id);

          stats[list.campaign.code].history[day].scanned += scan.count;
        }
      }
    }

    if ('received' in list) {
      for (const scan of list.received) {
        // we have to bring the date into the same format (UNIX time) as now
        const timestamp = Date.parse(scan.timestamp);

        if (timestamp > startDate && timestamp < endDate) {
          const day = scan.timestamp.substring(0, 10);

          if (!(day in stats[list.campaign.code].history)) {
            stats[list.campaign.code].history[day] = {
              usersWhoScanned: new Set(),
              received: 0,
              downloads: 0,
              scanned: 0,
              scannedLists: new Set(),
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
  for (const campaign in stats) {
    if (Object.prototype.hasOwnProperty.call(stats, campaign)) {
      const historyArray = [];

      // Transform the object into an array
      for (const day in stats[campaign].history) {
        if (
          Object.prototype.hasOwnProperty.call(stats[campaign].history, day)
        ) {
          const dayObject = {
            day,
          };

          if ('downloads' in stats[campaign].history[day]) {
            dayObject.downloads = stats[campaign].history[day].downloads;
          }

          if ('usersWhoScanned' in stats[campaign].history[day]) {
            dayObject.usersWhoScanned =
              stats[campaign].history[day].usersWhoScanned.size;
          }

          if ('received' in stats[campaign].history[day]) {
            dayObject.received = stats[campaign].history[day].received;
          }

          if ('scanned' in stats[campaign].history[day]) {
            dayObject.scanned = stats[campaign].history[day].scanned;
          }

          if ('scannedLists' in stats[campaign].history[day]) {
            dayObject.scannedLists =
              stats[campaign].history[day].scannedLists.size;
          }

          historyArray.push(dayObject);
        }
      }
      // Sort the array (earliest first)
      historyArray.sort(
        (element1, element2) => new Date(element1.day) - new Date(element2.day)
      );

      stats[campaign] = historyArray;
    }
  }

  return stats;
};
