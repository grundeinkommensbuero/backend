const { getUserByMail } = require('../../shared/users/getUsers');
const fs = require('fs');
const parse = require('csv-parse');
const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const PATH = './HH Ergebnisse Briefaktion.csv';

const analyse = async () => {
  const users = await readCsv();

  let totalCount = 0;
  let hasSentCount = 0;

  for (let user of users) {
    const result = await getUserByMail('prod-users', user.email);

    if (result.Count > 0) {
      const signatureLists = await getSignatureListsOfUser(
        result.Items[0].cognitoId
      );

      let receivedCount = 0;

      for (let list of signatureLists) {
        if (list.manually && 'received' in list) {
          for (let scan of list.received) {
            receivedCount += scan.count;
          }

          hasSentCount++;
        }

        if (!list.manually) {
          console.log('user has not manual list');
        }
      }

      console.log('receivedCount', user.email, receivedCount);

      totalCount += receivedCount;
    }
  }

  console.log('users', users.length);
  console.log('total count', totalCount);
  console.log('has sent count', hasSentCount);
  console.log('average', totalCount / users.length);
};

//reads and parses the csv file and returns a promise containing
//an array of the users
const readCsv = () => {
  return new Promise(resolve => {
    const users = [];
    let count = 0;

    fs.createReadStream(PATH)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        //leave out headers
        if (count > 0) {
          user = {
            email: row[12] === '' ? row[9] : row[12],
          };

          if (typeof user !== 'undefined' && user.email !== '') {
            users.push(user);
          }
        }

        count++;
      })
      .on('end', () => {
        console.log('finished parsing');
        resolve(users);
      });
  });
};

//function to get signature lists for this particular user
const getSignatureListsOfUser = async (
  userId,
  campaignCode = null,
  signatureLists = [],
  startKey = null
) => {
  let filter;
  let values = { ':userId': userId };
  if (campaignCode) {
    filter = 'userId = :userId AND campaign.code = :campaignCode';
    values[':campaignCode'] = campaignCode;
  } else {
    filter = 'userId = :userId';
  }

  const params = {
    TableName: 'prod-signatures',
    FilterExpression: filter,
    ExpressionAttributeValues: values,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();
  //add elements to existing array
  signatureLists.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getSignatureListsOfUser(
      userId,
      campaignCode,
      signatureLists,
      result.LastEvaluatedKey
    );
  } else {
    //otherwise return the array
    return signatureLists;
  }
};

analyse();
