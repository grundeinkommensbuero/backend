const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();
const { constructCampaignId } = require('../../shared/utils');
const tableName = process.env.USERS_TABLE_NAME;

module.exports.savePledge = (userId, requestBody) => {
  const date = new Date();
  const timestamp = date.toISOString();

  //check which pledge it is (e.g. pledgeId='brandenburg-1')
  //create a (nice to later work with) object, which campaign it is
  const campaign = constructCampaignId(requestBody.pledgeId);

  const pledge = {
    campaign: campaign,
    createdAt: timestamp,
  };
  // For the state specific pledges a signature count was sent
  if ('signatureCount' in requestBody) {
    pledge.signatureCount = requestBody.signatureCount;
  }

  // For the general "pledge" (more like a newsletter sign up)
  if ('message' in requestBody && requestBody.message !== '') {
    pledge.message = requestBody.message;
  }

  const data = {
    //needs to be array because append_list works with an array
    ':pledge': [pledge],
    ':zipCode': 'zipCode' in requestBody ? requestBody.zipCode : 'empty',
    ':username':
      'name' in requestBody && requestBody.name !== ''
        ? requestBody.name
        : 'empty',
    ':referral': 'referral' in requestBody ? requestBody.referral : 'empty',
    ':newsletterConsent': {
      value: requestBody.newsletterConsent,
      timestamp: timestamp,
    },
    ':emptyList': [],
  };

  // If city is the request body we add it (is the case for general pledge)
  if ('city' in requestBody && requestBody.city !== '') {
    data[':city'] = requestBody.city;
  }

  // if there is no pledges key yet we initiate it with an array,
  // otherwise we add the pledge to the array
  const updateExpression = `
  set ${':city' in data ? 'city = :city,' : ''}
  pledges = list_append(if_not_exists(pledges, :emptyList), :pledge),
  zipCode = :zipCode,
  username = :username,
  referral = :referral,
  newsletterConsent = :newsletterConsent
  `;

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: data,
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};
