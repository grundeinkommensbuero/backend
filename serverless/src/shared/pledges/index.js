const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();
const { constructCampaignId } = require('../../shared/utils');

const tableName = process.env.USERS_TABLE_NAME;

module.exports.savePledge = (userId, { pledgeId, message, signatureCount }) => {
  const timestamp = new Date().toISOString();

  // check which pledge it is (e.g. pledgeId='brandenburg-1')
  // create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(pledgeId);

  const pledge = {
    campaign,
    createdAt: timestamp,
    // For the general "pledge" (more like a newsletter sign up)
    message,
    // For the state specific pledges a signature count was sent
    signatureCount,
  };

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression:
      // if there is no pledges key yet we initiate it with an array,
      // otherwise we add the pledge to the array
      'SET pledges = list_append(if_not_exists(pledges, :emptyList), :pledge)',
    ExpressionAttributeValues: {
      // needs to be array because append_list works with an array
      ':pledge': [pledge],
      ':emptyList': [],
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};
