/**
 * Util script to sign up users of berlin, bremen and hamburg
 */

const { getAllUsers } = require('../../shared/users/getUsers');
const { getSignatureListsOfUser } = require('../../shared/signatures');
const zipCodeMatcher = require('../../shared/zipCodeMatcher');
const AWS = require('aws-sdk');

const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);

const {
  PROD_USERS_TABLE_NAME,
  PROD_SIGNATURES_TABLE_NAME,
  PROD_USER_MUNICIPALITY_TABLE_NAME,
} = require('../../config');

const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({ minTime: 100, maxConcurrent: 2 });

const stateToAgs = {
  berlin: '11000000',
  bremen: '04011000',
  hamburg: '02000000',
};

const stateToPopulation = {
  berlin: 3669491,
  bremen: 567559,
  hamburg: 1847253,
};

const signUpUsersForMunicipality = async () => {
  const users = await getAllUsers(PROD_USERS_TABLE_NAME);
  console.log('users retrieved');

  const counts = {
    alreadySignedUp: 0,
    'signedUpNow-bremen': 0,
    'signedUpNow-berlin': 0,
    'signedUpNow-hamburg': 0,
    shouldNotBeSignedUp: 0,
  };

  for (const user of users) {
    await limiter.schedule(async () => {
      const status = await refactorUser(user);

      counts[status]++;
      console.log('signed up', user.cognitoId, counts, users.length);
    });
  }
};

const refactorUser = async user => {
  let status = 'shouldNotBeSignedUp';

  const signatureListsResult = await getSignatureListsOfUser(
    PROD_SIGNATURES_TABLE_NAME,
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

  if (region === 'Berlin' || region === 'Hamburg' || region === 'Bremen') {
    activeIn[region.toLowerCase()] = true;
  }

  if ('migrated' in user) {
    if (user.migrated.source === 'offline') {
      activeIn[user.migrated.campaign.state] = true;
    }
  }

  for (const state in activeIn) {
    if (state === 'berlin' || state === 'hamburg' || state === 'bremen') {
      if (Object.prototype.hasOwnProperty.call(activeIn, state)) {
        // Check if it is set to true for this state
        if (activeIn[state]) {
          // Sign up user for municipality

          // Query user municipality table to check if user has already signed up for this munic
          const userMunicipalityResult = await getUserMunicipalityLink(
            stateToAgs[state],
            user.cognitoId
          );

          // If Item is result user has already signed up
          if (!('Item' in userMunicipalityResult)) {
            await createUserMunicipalityLink(
              stateToAgs[state],
              user.cognitoId,
              stateToPopulation[state]
            );

            status = `signedUpNow-${state}`;
          } else if (!status.startsWith('signedUpNow')) {
            status = 'alreadySignedUp';
          }
        }
      }
    }
  }

  return status;
};

// Update userMunicipality table to create the link between user and munic
const createUserMunicipalityLink = (ags, userId, population) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: PROD_USER_MUNICIPALITY_TABLE_NAME,
    Item: {
      ags,
      userId,
      createdAt: timestamp,
      population,
      manually: true,
    },
  };

  return ddb.put(params).promise();
};

const getUserMunicipalityLink = (ags, userId) => {
  const params = {
    TableName: PROD_USER_MUNICIPALITY_TABLE_NAME,
    Key: {
      ags,
      userId,
    },
  };

  return ddb.get(params).promise();
};

signUpUsersForMunicipality();
