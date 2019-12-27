/**
 * This lambda is used to update the dynamo db by:
 * - refactor pledge to be inside of an array
 * - add timestamp to newsletter consent
 * (- renaming pledge key to something more specific (schleswig-holstein-1))
 */

const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
// const tableName = process.env.usersTableName;
const tableName = 'UsersWithoutConsent-14-11';
const signaturesTableName = 'Signatures';

const refactorDynamo = async () => {
  try {
    const users = await getAllUsers();
    for (let user of users.Items) {
      console.log('user', user);
      // check if user contains a valid pledge for the key 'pledge'
      if (
        'pledge-schleswig-holstein-1' in user &&
        typeof user['pledge-schleswig-holstein-1'] === 'object'
      ) {
        //update name of pledge key/column
        try {
          const result = await movePledgeToArray(user);
          console.log('success changing pledge key', result);
        } catch (error) {
          console.log('error changing pledge key', error);
          break; //if there is something wrong, we want to break out of the loop
        }
      } else {
        console.log('not in user');
      }
      //refactor newsletter consent to use format {value: boolean, timestamp: string} instead of boolean
      //check if it is still in old format
      if (typeof user.newsletterConsent === 'boolean') {
        console.log('old format');
        try {
          const result = await changeNewsletterConsent(user);
          console.log('success changing newsletter consent', result);
        } catch (error) {
          console.log('error changing newsletter consent', error);
          break; //if there is something wrong, we want to break out of the loop
        }
      }
    }
  } catch (error) {
    console.log('error while fetching users from db', error);
  }
  return;
};

const getAllUsers = () => {
  const params = {
    TableName: tableName,
  };
  return ddb.scan(params).promise();
};

// function to move pledge object to new key
const changePledgeKey = user => {
  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: user.cognitoId },
      UpdateExpression: 'SET #pledgeKey = :pledge REMOVE pledge',
      ExpressionAttributeValues: { ':pledge': user.pledge },
      ExpressionAttributeNames: {
        '#pledgeKey': 'pledge-schleswig-holstein-1', //to work properly we need to use a placeholder (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html#ExpressionAttributeNames)
      },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const movePledgeToArray = user => {
  const newPledge = user['pledge-schleswig-holstein-1'];
  newPledge.campaign = constructCampaignId('schleswig-holstein-1');
  //needs to be array because append_list works with an array
  const pledge = [newPledge];
  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: user.cognitoId },
      UpdateExpression:
        'set pledges = list_append(if_not_exists(pledges, :emptyList), :pledge) REMOVE #oldPledgeKey',
      ExpressionAttributeValues: {
        ':pledge': pledge,
        ':emptyList': [],
      },
      ExpressionAttributeNames: {
        '#oldPledgeKey': 'pledge-schleswig-holstein-1', //to work properly we need to use a placeholder (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html#ExpressionAttributeNames)
      },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const changeNewsletterConsent = user => {
  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: user.cognitoId },
      UpdateExpression: 'SET newsletterConsent = :newsletterConsent',
      ExpressionAttributeValues: {
        ':newsletterConsent': {
          value: user.newsletterConsent,
          timestamp: user.createdAt,
        },
      },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const constructCampaignId = campaignCode => {
  const campaign = {};
  if (typeof campaignCode !== 'undefined') {
    //we want to remove the last characters from the string (brandenburg-2 -> brandenburg)
    campaign.state = campaignCode.substring(0, campaignCode.length - 2);
    //...and take the last char and save it as number
    campaign.round = parseInt(
      campaignCode.substring(campaignCode.length - 1, campaignCode.length)
    );
    campaign.code = campaignCode;
  }
  return campaign;
};

const refactorSignatureLists = async () => {
  try {
    const signatureLists = await getSignatureLists();
    for (let list of signatureLists) {
      console.log('updating list', list.id);
      await updateSignatureList(list.id);
    }
  } catch (error) {
    console.log('error', error);
  }
};

const updateSignatureList = id => {
  const params = {
    TableName: signaturesTableName,
    Key: { id: id },
    UpdateExpression: 'REMOVE received',
  };
  return ddb.update(params).promise();
};

//function to get all signature lists
const getSignatureLists = async (signatureLists = [], startKey = null) => {
  const params = {
    TableName: signaturesTableName,
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

// refactorDynamo();
refactorSignatureLists();
