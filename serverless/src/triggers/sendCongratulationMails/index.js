const AWS = require('aws-sdk');
const sendMail = require('./sendMail');
const {
  getSignatureCountFromContentful,
} = require('../../shared/signatures/contentfulApi');
const { getUser } = require('../../shared/users');
const {
  getSignatureCountOfAllLists,
  getSignatureListsOfUser,
} = require('../../shared/signatures');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;

module.exports.handler = async event => {
  try {
    // Needed for checking, if scan was made during last day,
    // round the date to nearest 5 min
    const now =
      Math.round(new Date().getTime() / (1000 * 60 * 5)) * (1000 * 60 * 5);

    // user object will contain signature count for a specific user id
    const usersMap = {};
    const signatureLists = await getReceivedSignatureLists();

    // We want to save the campaign for which there was a scan today
    let campaignToday;
    for (const list of signatureLists) {
      if (
        list.campaign.code === 'democracy-1' ||
        list.campaign.code === 'berlin-2' ||
        list.campaign.code === 'hamburg-2'
      ) {
        // loop through the scan array and check if there were new
        // scans during the last 24h
        let dailyCount = 0;
        let totalCount = 0;

        for (const scan of list.received) {
          // we have to bring the date into the same format (UNIX time) as now
          const scannedAt = Date.parse(scan.timestamp);
          const oneDay = 24 * 60 * 60 * 1000;

          // if the scan was during the last day add it to the count
          if (now - scannedAt < oneDay) {
            dailyCount += scan.count;
            campaignToday = list.campaign;
          }

          // we also want to compute the total count to check,
          // if it is different to the daily count
          totalCount += scan.count;
        }

        // check if user is not anonymous
        if (list.userId !== 'anonymous') {
          if (!(list.userId in usersMap)) {
            // get user to get mail
            const result = await getUser(list.userId);

            // the user might have been deleted or does not have
            // reminder mails setting to true
            if (
              'Item' in result &&
              'reminderMails' in result.Item &&
              result.Item.reminderMails.value
            ) {
              // initialize an object in the map
              usersMap[list.userId] = {
                dailyCount,
                totalCount,
                email: result.Item.email,
                username: result.Item.username,
                userId: result.Item.cognitoId,
                campaign: campaignToday,
                pdfUrl: list.pdfUrl,
              };
            }
          } else {
            // if there already is an entry in the map, change the values
            usersMap[list.userId].dailyCount += dailyCount;
            usersMap[list.userId].totalCount += totalCount;
            usersMap[list.userId].campaign = campaignToday;
          }
        }
      }
    }

    /*
    TODO: reactivate for berlin-2
    // Make api call to contentful to compute the total number of signatures
    const contentfulCounts = await getSignatureCountFromContentful();

    // Use the same function as in getSignatureCount to get total count
    const totalCountForAllUsers = await getSignatureCountOfAllLists();

    */
    // go through the user map to send a mail to every user
    // of whom we have scanned a list during the last day
    for (const key in usersMap) {
      if (usersMap[key].dailyCount > 0) {
        /*

        TODO: reactivate for berlin-2
        let totalCountForThisCampaign =
          totalCountForAllUsers[usersMap[key].campaign.code].computed;
        const contentfulCountForThisCampaign =
          contentfulCounts[usersMap[key].campaign.code];

        console.log('contetful count', contentfulCounts);
        console.log(
          'contetful count for this campaign',
          contentfulCountForThisCampaign
        );

        // addToSignatureCount is a sort of a base number
        // which is defined in contentful
        if (contentfulCountForThisCampaign.addToSignatureCount) {
          totalCountForThisCampaign +=
            contentfulCountForThisCampaign.addToSignatureCount;
        }

        // if the minimum contentful signature count is more, use that number
        if (contentfulCountForThisCampaign.minimum) {
          totalCountForThisCampaign = Math.max(
            totalCountForThisCampaign,
            contentfulCountForThisCampaign.minimum
          );
        }

        // If there is no pdf url (e.g. user has ordered list via mail)
        // get the url for the latest anonymous list
        if (!usersMap[key].pdfUrl) {
          const mostRecentList = await getMostRecentAnonymousList(
            usersMap[key].campaign.code
          );
          usersMap[key].pdfUrl = mostRecentList ? mostRecentList.pdfUrl : '';
        }

        */
        try {
          // await sendMail(usersMap[key], totalCountForThisCampaign);
          await sendMail(usersMap[key], 0);
          console.log(
            'success sending mail to',
            usersMap[key].email,
            usersMap[key].username
          );
        } catch (error) {
          console.log('error sending mail', error);
        }
      }
    }

    return event;
  } catch (error) {
    console.log('error', error);
  }

  return event;
};

// function to get all signature lists, where there is a received key
const getReceivedSignatureLists = async (
  signatureLists = [],
  startKey = null
) => {
  const params = {
    TableName: signaturesTableName,
    FilterExpression: 'attribute_exists(received)',
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  // add elements to existing array
  signatureLists.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getReceivedSignatureLists(signatureLists, result.LastEvaluatedKey);
  }
  // otherwise return the array
  return signatureLists;
};

const getMostRecentAnonymousList = async campaignCode => {
  const result = await getSignatureListsOfUser('anonymous', campaignCode);

  const signatureLists = result.Items;

  // Sort signature lists by date (most recent first)
  signatureLists.sort(
    (list1, list2) => new Date(list2.createdAt) - new Date(list1.createdAt)
  );

  return signatureLists[0];
};
