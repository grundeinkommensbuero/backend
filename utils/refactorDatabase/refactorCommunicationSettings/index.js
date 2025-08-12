const { getAllUsers } = require('../../shared/users/getUsers');
const { getSignatureListsOfUser } = require('../../shared/signatures');
const zipCodeMatcher = require('../../shared/zipCodeMatcher');

const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));

const {
  DEV_USERS_TABLE_NAME,
  DEV_SIGNATURES_TABLE_NAME,
} = require('../../config');

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 2 });

const stateToAgs = {
  berlin: '11000000',
  bremen: '04011000',
  hamburg: '02000000',
};

const refactorSettings = async () => {
  const users = await getAllUsers(DEV_USERS_TABLE_NAME);

  for (const user of users) {
    // Only add new newsletter settings, if user has newsletter consent
    if (user.newsletterConsent.value) {
      await limiter.schedule(async () => {
        await refactorUser(user);
        console.log('refactored', user.cognitoId);
      });
    }
  }
};

const refactorUser = async user => {
  // Get signature lists of this user and add it to user object
  const signatureListsResult = await getSignatureListsOfUser(
    DEV_SIGNATURES_TABLE_NAME,
    user.cognitoId
  );

  const activeIn = {};

  for (const list of signatureListsResult.Items) {
    activeIn[list.campaign.state] = true;
  }

  if ('pledges' in user) {
    for (const pledge of user.pledges) {
      activeIn[pledge.campaign.state] = true;
    }
  }

  let region;
  if ('zipCode' in user) {
    region = zipCodeMatcher.getStateByZipCode(user.zipCode);
  }

  if (
    region === 'Berlin' ||
    region === 'Schleswig-Holstein' ||
    region === 'Hamburg' ||
    region === 'Brandenburg' ||
    region === 'Bremen'
  ) {
    activeIn[region.toLowerCase()] = true;
  }

  if ('migrated' in user) {
    if (user.migrated.source === 'offline') {
      activeIn[user.migrated.campaign.state] = true;
    }
  }

  // Build new customNewsletters array
  const customNewsletters = [];

  for (const state in activeIn) {
    if (Object.prototype.hasOwnProperty.call(activeIn, state)) {
      // Check if it is set to true for this state
      if (activeIn[state]) {
        customNewsletters.push({
          name: capitalizeState(state),
          value: true,
          extraInfo: false,
          timestamp: user.newsletterConsent.timestamp,
          ags: stateToAgs[state],
        });
      }
    }
  }

  if (customNewsletters.length > 0) {
    const params = {
      TableName: DEV_USERS_TABLE_NAME,
      Key: { cognitoId: user.cognitoId },
      UpdateExpression: 'SET customNewsletters =  :customNewsletters',
      ExpressionAttributeValues: {
        ':customNewsletters': customNewsletters,
      },
      ReturnValues: 'UPDATED_NEW',
    };

    await ddb.update(params);
  }
};

const capitalizeState = state => {
  const stringSplit = state.split('-');
  if (stringSplit.length > 1) {
    return `${capitalize(stringSplit[0])}-${capitalize(stringSplit[1])}`;
  }

  return `${capitalize(stringSplit[0])}`;
};

const capitalize = string => {
  return `${string.charAt(0).toUpperCase()}${string.slice(1)}`;
};

refactorSettings();
