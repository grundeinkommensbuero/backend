const AWS = require('aws-sdk');
const sendMail = require('./sendMail');
const { getSignatureCountFromContentful } = require('./contentfulApi');
const { getUser } = require('../../shared/users');
const { getSignatureCountOfAllLists } = require('../../shared/signatures');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const signaturesTableName = process.env.SIGNATURES_TABLE_NAME;

module.exports.handler = async event => {
  try {
    // user object will contain signature count for a specific user id
    const usersMap = {};
    const signatureLists = await getReceivedSignatureLists();

    for (let list of signatureLists) {
      // loop through the scan array and check if there were new
      // scans during the last 24h
      let dailyCount = 0;
      let totalCount = 0;

      console.log('list', list);
      for (let scan of list.received) {
        // we have to bring the two dates into the same format (UNIX time)
        const now = new Date().getTime();
        const scannedAt = Date.parse(scan.timestamp);
        const oneDay = 24 * 60 * 60 * 1000;

        // if the scan was during the last day add it to the count
        if (now - scannedAt < oneDay) {
          dailyCount += scan.count;
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
          // newsletter consent
          if (
            'Item' in result &&
            'newsletterConsent' in result.Item &&
            result.Item.newsletterConsent.value
          ) {
            // initialize an object in the map
            usersMap[list.userId] = {
              dailyCount,
              totalCount,
              email: result.Item.email,
              username: result.Item.username,
              userId: result.Item.cognitoId,
              campaign: list.campaign,
            };
          }
        } else {
          // if there already is an entry in the map, change the values
          usersMap[list.userId].dailyCount += dailyCount;
          usersMap[list.userId].totalCount += totalCount;
        }
      }
    }

    // Make api call to contentful to compute the total number of signatures
    const contentfulCounts = await getSignatureCountFromContentful();

    // Use the same function as in getSignatureCount to get total count
    const totalCountForAllUsers = await getSignatureCountOfAllLists();

    //go through the user map to send a mail to every user
    //of whom we have scanned a list during the last day
    for (let key in usersMap) {
      if (usersMap[key].dailyCount > 0) {
        let totalCountForThisCampaign =
          totalCountForAllUsers[usersMap[key].campaign.code].computed;
        let contentfulCountForThisCampaign =
          contentfulCounts[usersMap[key].campaign.code];

        console.log('campaign', usersMap[key].campaign.code);

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

        //if the minimum contentful signature count is more, use that number
        if (contentfulCountForThisCampaign.minimum) {
          totalCountForThisCampaign = Math.max(
            totalCountForThisCampaign,
            contentfulCountForThisCampaign.minimum
          );
        }

        await sendMail(usersMap[key], totalCountForThisCampaign);
        console.log('success sending mail');
      }
    }

    return event;
  } catch (error) {
    console.log('error', error);
  }
};

//function to get all signature lists, where there is a received key
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
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getReceivedSignatureLists(signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};
