const AWS = require('aws-sdk');
const {
  analyseSignatureLists,
} = require('../../api/signatures/getSignatureListCount/analyseSignatureLists');
const {
  getNotReceivedSignatureLists,
  getSignatureCountOfAllLists,
} = require('../../shared/signatures');
const { getUser } = require('../../shared/users');
const sendMail = require('./sendMail');
const { sendErrorMail } = require('../../shared/errorHandling');
const { computeMailType } = require('./computeMailType');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const usersTableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  // Deactived for now
  return event;

  try {
    // Get general stats
    // and Get all lists which were not received yet
    const [signatureLists, signatureCounts, listCounts] = await Promise.all([
      getNotReceivedSignatureLists(),
      getSignatureCountOfAllLists(),
      analyseSignatureLists(),
    ]);

    // Loop through lists to check if a list was created x days ago
    for (const list of signatureLists) {
      // We only need to check lists of users and lists which were not part of letter action.
      if (
        list.userId !== 'anonymous' &&
        !list.manually &&
        list.campaign.code === 'berlin-2'
      ) {
        // Get user from users table to get email
        const result = await getUser(list.userId);

        // the user might have been deleted, does not have
        // reminder mail setting to true or has said that they already received the list
        if (
          'Item' in result &&
          'reminderMails' in result.Item &&
          result.Item.reminderMails.value
        ) {
          const user = result.Item;

          const mailTypes = computeMailType(user, list);

          if (mailTypes.length > 0) {
            const promises = [];
            for (const mailType of mailTypes) {
              promises.push(
                sendMail(
                  user,
                  list.id,
                  list.campaign,
                  getDaysSince(new Date(list.createdAt)),
                  mailType,
                  signatureCounts,
                  listCounts
                )
              );
            }

            await Promise.all(
              promises,
              // We also want to update user to save the email which was sent
              updateUser(user, mailTypes)
            );

            console.log('success sending mail to', user.email);
          }
        }
      }
    }
  } catch (error) {
    console.log('error', error);
    await sendErrorMail('List flow', error);
  }

  return event;
};

const updateUser = (user, mailTypes) => {
  const timestamp = new Date().toISOString();
  const listFlow = user.listFlow || {};
  listFlow.emailsSent = listFlow.emailsSent || [];

  const ctaFlow = user.ctaFlow || {};
  ctaFlow.emailsSent = ctaFlow.emailsSent || [];

  // Depending on the mail type we save the emailSent
  // in different keys
  for (const mailType of mailTypes) {
    if (mailType.startsWith('B')) {
      listFlow.emailsSent.push({
        key: mailType,
        timestamp,
      });
    } else if (mailType.startsWith('A')) {
      ctaFlow.emailsSent.push({
        key: mailType,
        timestamp,
      });
    }
  }

  const data = {
    ':updatedAt': timestamp,
  };

  if (Object.keys(listFlow).length > 0) {
    data[':listFlow'] = listFlow;
  }

  if (Object.keys(ctaFlow).length > 0) {
    data[':ctaFlow'] = ctaFlow;
  }

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: `SET ${
      Object.keys(listFlow).length > 0 ? 'listFlow = :listFlow,' : ''
    }
    ${Object.keys(ctaFlow).length > 0 ? 'ctaFlow = :ctaFlow,' : ''}
     updatedAt = :updatedAt`,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

const getDaysSince = date => {
  const now = new Date();

  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
};
