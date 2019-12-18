const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const signaturesTableName = 'Signatures';
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async event => {
  try {
    let stats = {};

    //get all lists with received attriubte
    const signatureLists = await getReceivedSignatureLists();

    //loop through lists to compute the stats for each campaign
    for (let list of signatureLists) {
      const campaign = list.campaign.code;

      //check if campaign is already in stats
      if (!(campaign in stats)) {
        //initialize object for this campaign
        stats[campaign] = {
          withoutMixed: 0,
          withMixed: 0,
        };
      }

      if (list.received !== 0) {
        //loop through scans for this list and add the count
        for (let scan of list.received) {
          //if there were signatures on this list, which belong to
          //different "Ämters" (mixed), only add the count to withMixed
          if (!scan.mixed) {
            stats[campaign].withoutMixed += scan.count;
          }

          stats[campaign].withMixed += scan.count;
        }
      }
    }

    // return message
    return {
      statusCode: 200,
      headers: responseHeaders,
      isBase64Encoded: false,
      body: JSON.stringify(stats),
    };
  } catch (error) {
    console.log('error while computing stats', error);
    return errorResponse(500, 'Error while computing stats', error);
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

const errorResponse = (statusCode, message, error = null) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message: message,
      error: error,
    });
  } else {
    body = JSON.stringify({
      message: message,
    });
  }
  return {
    statusCode: statusCode,
    body: body,
    headers: responseHeaders,
    isBase64Encoded: false,
  };
};
