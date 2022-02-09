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
      // Also we want to deactivate the berlin, sh and brandenburg lists for now...
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

          const mailType = computeMailType(user, list);

          if (mailType) {
            // TODO: this will have to be updated, as soon as it is clear, what params the emails need
            await Promise.all(
              sendMail(
                user,
                list.id,
                list.campaign,
                mailType,
                signatureCounts,
                listCounts
              ),
              // We also want to update user to save the email which was sent
              updateUser(user, mailType)
            );
          }

          console.log('success sending mail to', user.email);
        }
      }
    }
  } catch (error) {
    console.log('error', error);
    await sendErrorMail('List flow', error);
  }

  return event;
};

const updateUser = (user, mailType) => {
  const timestamp = new Date().toISOString();

  const listFlow = user.listFlow || {};
  listFlow.emailsSent = listFlow.emailsSent || [];
  listFlow.emailsSent.push({
    key: mailType,
    timestamp,
  });

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: 'SET listFlow = :listFlow, updatedAt = :updatedAt',
    ExpressionAttributeValues: {
      ':listFlow': listFlow,
      ':updatedAt': timestamp,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};
