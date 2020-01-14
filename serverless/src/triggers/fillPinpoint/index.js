const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const pinpoint = new AWS.Pinpoint(config);
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);

const { getSignatureListsOfUser } = require('../../shared/signatures');
const { USERS_TABLE_NAME: tableName, USER_POOL_ID: userPoolId } = process.env;

const zipCodeMatcher = require('./zipCodeMatcher');

module.exports.handler = async event => {
  // Only run the script if the environment is prod
  if (process.env.STAGE === 'prod') {
    await fillPinpoint();
  }

  return event;
};

// Loops through all users to update the corrsesponding pinpoint endpoint
const fillPinpoint = async () => {
  try {
    let users = await getAllUsers();
    const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();
    //loop through backup users and add all the users who are not already in users

    let count = 0;
    for (let user of users) {
      //check if the user is verified
      const verified = isVerified(user, unverifiedCognitoUsers);

      // Get signature lists of this user and add it to user object
      user.signatureLists = await getSignatureListsOfUser(user.cognitoId);

      await updateEndpoint(user, verified);

      count++;
    }

    console.log('updated count', count);
  } catch (error) {
    console.log('error', error);
  }
};

const updateEndpoint = async (user, verified) => {
  const {
    cognitoId: userId, //rename cognitoId to userId while destructuring
    createdAt,
    email,
    zipCode,
    username,
    referral,
    migrated,
  } = user;

  let { newsletterConsent } = user;

  //for now we just take the first pledge
  let pledge;
  if ('pledges' in user) {
    pledge = user.pledges[0];
  }

  const pledgeAttributes = [];
  if (typeof pledge !== 'undefined' && pledge !== null) {
    if (pledge.wouldPrintAndSendSignatureLists) {
      pledgeAttributes.push('wouldPrintAndSendSignatureLists');
    }
    if (pledge.wouldCollectSignaturesInPublicSpaces) {
      pledgeAttributes.push('wouldCollectSignaturesInPublicSpaces');
    }
    if (pledge.wouldPutAndCollectSignatureLists) {
      pledgeAttributes.push('wouldPutAndCollectSignatureLists');
    }
    if (pledge.wouldDonate) {
      pledgeAttributes.push('wouldDonate');
    }
    if (
      'wouldEngageCustom' in pledge &&
      pledge.wouldEngageCustom !== 'empty' &&
      pledge.wouldEngageCustom.length < 50
    ) {
      pledgeAttributes.push(pledge.wouldEngageCustom);
    }
  }

  // Make use of utility function to match the state to a given zip code
  let region = 'undefined';
  if (typeof zipCode !== 'undefined') {
    region = zipCodeMatcher.getStateByZipCode(zipCode);
  }

  //workaround, while some newsletter consents may already have the new format {value, timestamp}
  //old format is just boolean
  if (typeof newsletterConsent !== 'undefined') {
    newsletterConsent =
      typeof newsletterConsent === 'boolean'
        ? newsletterConsent
        : newsletterConsent.value;
  } else {
    newsletterConsent = false;
  }

  //construct name with space before
  let pinpointName;
  if (typeof username !== 'undefined' && username !== 'empty') {
    pinpointName = `&#160;${username}`;
  } else {
    pinpointName = '';
  }

  //some signatureCounts were saved as string (need to refactor in db),
  //which is why we need to parse them
  let signatureCount =
    typeof pledge !== 'undefined' ? parseInt(pledge.signatureCount) : 0;
  signatureCount = isNaN(signatureCount) ? 0 : signatureCount;

  const params = {
    ApplicationId: projectId,
    EndpointId: `email-endpoint-${userId}`,
    EndpointRequest: {
      ChannelType: 'EMAIL',
      Address: email,
      Attributes: {
        Referral: [referral],
        Region: [region],
        Pledge: pledgeAttributes,
        PledgeCampaignCode: [
          typeof pledge !== 'undefined' ? pledge.campaign.code : 'undefined',
        ],
        SignaturesCampaignCode:
          user.signatureLists.length > 0
            ? user.signatureLists.map(list => list.campaign.code)
            : [],
        PostalCode: [typeof zipCode !== 'undefined' ? zipCode : 'undefined'],
        // Username: [username], -> not eneeded anymore, and there's a limit to attributes
        UsernameWithSpace: [pinpointName],
        Newsletter: [newsletterConsent ? 'Ja' : 'Nein'],
        Migrated: [typeof migrated !== 'undefined' ? migrated.source : 'Nein'],
        //if user migrated from 'offline' (meaning subscribed to newsletter
        //while singing the petition) we want to add the campaign
        OfflineCampaignCode: [
          typeof migrated !== 'undefined' && migrated.source === 'offline'
            ? migrated.campaign.code
            : 'undefined',
        ],
      },
      EffectiveDate: createdAt,
      Location: {
        PostalCode: typeof zipCode !== 'undefined' ? zipCode : 'undefined',
        Region: region,
      },
      Metrics: {
        SignatureCount: signatureCount,
      },
      //if user is not yet verified opt out in pinpoint
      OptOut: verified ? 'NONE' : 'ALL',
      User: {
        UserId: userId,
      },
    },
  };

  return pinpoint.updateEndpoint(params).promise();
};

//function to get all users from dynamo
const getAllUsers = async (users = [], startKey = null) => {
  const params = {
    TableName: tableName,
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  const result = await ddb.scan(params).promise();

  //add elements to existing array
  users.push(...result.Items);

  //call same function again, if the whole table has not been scanned yet
  if ('LastEvaluatedKey' in result) {
    return getAllUsers(users, result.LastEvaluatedKey);
  } else {
    //otherwise return the array
    return users;
  }
};

const getAllUnverifiedCognitoUsers = async (
  unverifiedCognitoUsers = [],
  paginationToken = null
) => {
  const params = {
    UserPoolId: userPoolId,
    Filter: 'cognito:user_status = "UNCONFIRMED"',
    PaginationToken: paginationToken,
  };

  let data = await cognito.listUsers(params).promise();

  //add elements of user array
  unverifiedCognitoUsers.push(...data.Users);

  if ('PaginationToken' in data) {
    return getAllUnverifiedCognitoUsers(
      unverifiedCognitoUsers,
      data.PaginationToken
    );
  } else {
    return unverifiedCognitoUsers;
  }
};

// Checks, if the user is part of the unverified cognito users
// array, returns true if user is verified
const isVerified = (user, unverifiedCognitoUsers) => {
  let verified = true;

  for (let cognitoUser of unverifiedCognitoUsers) {
    //sub is the first attribute
    if (user.cognitoId === cognitoUser.Attributes[0].Value) {
      verified = false;
    }
  }

  return verified;
};
