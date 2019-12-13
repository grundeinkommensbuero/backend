const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const pinpoint = new AWS.Pinpoint(config);
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = 'Users';
const tableNameBackup = 'UsersWithoutConsent-14-11';

const zipCodeMatcher = require('../zipCodeMatcher');
const {
  getAllUnverifiedCognitoUsers,
  getAllUsers,
  isVerified,
} = require('../getUsers');

const updateEndpoint = async (user, verified = true) => {
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
  console.log('matched region', region);

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
        PostalCode: [typeof zipCode !== 'undefined' ? zipCode : 'undefined'],
        Username: [username],
        UsernameWithSpace: [pinpointName],
        Newsletter: [newsletterConsent ? 'Ja' : 'Nein'],
        Migrated: [typeof migrated !== 'undefined' ? migrated.source : 'Nein'],
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
  console.log('trying to update the endpoint with params:', params);
  const result = await pinpoint.updateEndpoint(params).promise();
  console.log('updated pinpoint', result);
};

const fillPinpoint = async () => {
  try {
    let users = await getAllUsers();
    const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();
    //loop through backup users and add all the users who are not already in users
    users = await migrateUsersFromBackup(users);
    let count = 0;
    for (let user of users) {
      //check if the user is verified
      const verified =
        isVerified(user, unverifiedCognitoUsers) || user.migrated;
      await updateEndpoint(user, verified);
      count++;
    }
    console.log('updated count', count);
  } catch (error) {
    console.log('error', error);
  }
};

const getAllUsersFromBackup = () => {
  const params = {
    TableName: tableNameBackup,
  };
  return ddb.scan(params).promise();
};

const migrateUsersFromBackup = async users => {
  let added = 0;
  const backupUsers = await getAllUsersFromBackup();
  console.log('Backup users count', backupUsers.Count);
  for (let backupUser of backupUsers.Items) {
    //check if the user is already in users
    if (users.findIndex(user => user.email === backupUser.email) === -1) {
      //backup user is not already in there
      backupUser.migrated = true;
      users.push(backupUser);
      added++;
    }
  }
  console.log(`Added ${added} users from backup`);
  return users;
};

const addKickOffToPinpoint = async user => {
  const params = {
    ApplicationId: projectId,
    EndpointId: `email-endpoint-${user.userId}`,
    EndpointRequest: {
      ChannelType: 'EMAIL',
      Attributes: {
        KickOff: [user.kickOff],
        PhoneNumber: [user.phoneNumber],
      },
    },
  };
  const result = await pinpoint.updateEndpoint(params).promise();
  console.log('updated pinpoint', result);
};

// fillPinpoint();
module.exports = { updateEndpoint, addKickOffToPinpoint };
