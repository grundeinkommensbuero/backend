const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const { PROD_USERS_TABLE_NAME } = require('../../config');

const fixSignatureCampaignsKey = async tableName => {
  try {
    const users = await getAllUsersWithWrongKey(tableName);

    for (const user of users) {
      let signatureCampaigns;
      if (user.signatureCampaigns) {
        signatureCampaigns = user.signatureCampaigns;

        if (user.signatureCampaings) {
          for (const campaign of user.signatureCampaings) {
            if (
              signatureCampaigns.findIndex(
                item => item.code === campaign.code
              ) === -1
            ) {
              signatureCampaigns.push(campaign);
            }
          }
        }
      }

      if (signatureCampaigns) {
        console.log('About to update', user.cognitoId);
        await updateUser(tableName, user.cognitoId, signatureCampaigns);
      }
    }
  } catch (error) {
    console.log('Error', error);
  }
};

const updateUser = async (tableName, userId, signatureCampaigns) => {
  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      'SET signatureCampaigns = :signatureCampaigns REMOVE signatureCampaings',
    ExpressionAttributeValues: {
      ':signatureCampaigns': signatureCampaigns,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

const getAllUsersWithWrongKey = async (
  tableName,
  users = [],
  startKey = null
) => {
  const params = {
    TableName: tableName,
    FilterExpression: 'attribute_exists(signatureCampaings)',
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  // add elements to existing array
  users.push(...result.Items);

  // call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return await getAllUsersWithWrongKey(
      tableName,
      users,
      result.LastEvaluatedKey
    );
  }
  // otherwise return the array
  return users;
};

fixSignatureCampaignsKey(PROD_USERS_TABLE_NAME);
