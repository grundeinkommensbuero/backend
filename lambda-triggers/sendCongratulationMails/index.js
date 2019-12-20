const AWS = require('aws-sdk');
const sendMail = require('./sendMail');
const { getSignatureCountFromContentful } = require('./contentfulApi');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const signaturesTableName = process.env.TABLE_NAME_SIGNATURES;
const usersTableName = process.env.TABLE_NAME_USERS;

exports.handler = async event => {
  try {
    //user object will contain signature count for a specific user id
    const usersMap = {};
    let totalCountForAllUsers = 0;
    const signatureLists = await getReceivedSignatureLists();

    for (let list of signatureLists) {
      //loop through the scan array and check if there were new
      //scans during the last 24h
      let dailyCount = 0;
      let totalCount = 0;

      console.log('list', list);
      for (let scan of list.received) {
        //we have to bring the two dates into the same format (UNIX time)
        const now = new Date().getTime();
        const scannedAt = Date.parse(scan.timestamp);
        const oneDay = 24 * 60 * 60 * 1000;

        //if the scan was during the last day add it to the count
        if (now - scannedAt < oneDay) {
          dailyCount += scan.count;
        }

        //we also want to compute the total count to check,
        //if it is different to the daily count
        totalCount += scan.count;

        //if there were signatures on this list, which belong to
        //different "Ämters" (mixed), we don't add the count
        if (!scan.mixed) {
          totalCountForAllUsers += scan.count;
        }
      }

      //check if user is not anonymous
      if (list.userId !== 'anonymous') {
        if (!(list.userId in usersMap)) {
          //get user to get mail
          const result = await getUser(list.userId);

          if (!('Item' in result)) {
            throw new Error('No user found with the given id');
          }

          //initialize an object in the map
          usersMap[list.userId] = {
            dailyCount,
            totalCount,
            email: result.Item.email,
            username: result.Item.username,
            userId: result.Item.cognitoId,
          };
        } else {
          //if there already is an entry in the map, change the values
          usersMap[list.userId].dailyCount += dailyCount;
          usersMap[list.userId].totalCount += totalCount;
        }
      }
    }

    //go through the user map to send a mail to every user
    //of whom we have scanned a list during the last day
    for (let key in usersMap) {
      if (usersMap[key].dailyCount > 0) {
        const contenfulCount = await getSignatureCountFromContentful();

        //if the contentful signature count is more use that number
        totalCountForAllUsers =
          contenfulCount > totalCountForAllUsers
            ? contenfulCount
            : totalCountForAllUsers;

        await sendMail(usersMap[key], totalCountForAllUsers);
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
    console.log('call get lists recursively');
    return getReceivedSignatureLists(signatureLists, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

const getUser = userId => {
  const params = {
    TableName: usersTableName,
    Key: {
      cognitoId: userId,
    },
  };
  return ddb.get(params).promise();
};
