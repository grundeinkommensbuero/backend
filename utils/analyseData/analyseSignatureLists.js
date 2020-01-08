const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const tableName = 'prod-signatures';

module.exports.analyseSignatureLists = async () => {
  const signatureLists = await getSignatureLists();
  const stats = {};

  //loop through lists to compute stats
  for (let list of signatureLists) {
    const campaign = list.campaign.code;

    //check if campaign is already in stats
    if (!(campaign in stats)) {
      //initialize object for this campaign
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

  return stats;
};

//function to get all signature lists
const getSignatureLists = async (signatureLists = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    console.log('call get lists recursively');
    return getSignatureLists(signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};
