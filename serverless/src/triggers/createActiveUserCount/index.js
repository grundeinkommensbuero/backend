const { errorResponse } = require('../../shared/apiResponse');
const { getAllUsers, getAllCognitoUsers } = require('../../shared/users');
const AWS = require('aws-sdk');

const THREE_MONTHS = 60 * 24 * 60 * 60 * 1000;
const s3 = new AWS.S3({ region: 'eu-central-1' });
const bucket = 'xbge-active-users-stats';
const stage = process.env.STAGE;

module.exports.handler = async event => {
  try {
    const users = await getAllUsers();
    const cognitoUsers = await getAllCognitoUsers();
    const uniqueUsers = new Set();
    let emailActivityCount = 0;
    let websiteActivityCount = 0;

    for (const user of users) {
      // Check if last activity on website exists and was during last 3 months
      if ('store' in user && 'lastActivity' in user.store) {
        if (new Date() - new Date(user.store.lastActivity) < THREE_MONTHS) {
          uniqueUsers.add(user.cognitoId);
          websiteActivityCount++;
        }
      } else {
        // If last activity does not exist yet, because we only introduced in december 2021
        // we want to check cognito for the last sign in
        const cognitoUser = cognitoUsers.find(
          ({ Username }) => user.cognitoId === Username
        );

        if (typeof cognitoUser !== 'undefined') {
          const lastSignIn = cognitoUser.Attributes.find(
            ({ Name }) => Name === 'custom:authChallenge'
          );
          if (typeof lastSignIn !== 'undefined') {
            // Get timestamp from last sign in
            const [, timestamp] = lastSignIn.Value.split(',');

            if (
              new Date().valueOf() / 1000 - Number(timestamp) <
              THREE_MONTHS
            ) {
              uniqueUsers.add(user.cognitoId);
              websiteActivityCount++;
            }
          }
        }
      }

      // Check if last email activity was during last 3 months
      if (
        'emailActivity' in user &&
        'lastOpen' in user.emailActivity &&
        new Date() - new Date(user.emailActivity.lastOpen) < THREE_MONTHS
      ) {
        uniqueUsers.add(user.cognitoId);
        emailActivityCount++;
      }
    }

    await saveJson(
      { count: uniqueUsers.size, emailActivityCount, websiteActivityCount },
      'stats.json'
    );

    return event;
  } catch (error) {
    console.log('error while creating user count', error);
    return errorResponse(500, 'error while creating user count', error);
  }
};

const saveJson = (json, fileName) => {
  const params = {
    Bucket: bucket,
    ACL: 'public-read',
    Key: `${stage}/${fileName}`,
    Body: JSON.stringify(json),
    ContentType: 'application/json',
  };

  return s3.upload(params).promise();
};
