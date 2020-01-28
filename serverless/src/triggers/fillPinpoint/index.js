const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const pinpoint = new AWS.Pinpoint(config);
const lambda = new AWS.Lambda();
const projectId = '83c543b1094c4a91bf31731cd3f2f005';

const { getSignatureListsOfUser } = require('../../shared/signatures');
const {
  getAllUnverifiedCognitoUsers,
  isVerified,
} = require('../../shared/users');

const zipCodeMatcher = require('./zipCodeMatcher');

const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async (event, context) => {
  // Only run the script if the environment is prod
  if (process.env.STAGE === 'prod') {
    await fillPinpoint(event, context);
  }

  return event;
};

// Loops through all users to update the corrsesponding pinpoint endpoint
const fillPinpoint = async (event, context) => {
  try {
    // If the lambda was invoked recursively we got the startKey as payload
    const startKey = event.startKey || null;
    console.log('startkey of new lambda', startKey);

    const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();

    await processBatchOfUsers(event, context, unverifiedCognitoUsers, startKey);
  } catch (error) {
    console.log('error', error);
  }
};

const getBatchOfUsers = (startKey = null) => {
  const params = {
    TableName: tableName,
  };

  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }

  return ddb.scan(params).promise();
};

const processBatchOfUsers = async (
  event,
  context,
  unverifiedCognitoUsers,
  startKey
) => {
  console.log('processing another batch with startKey', startKey);

  const result = await getBatchOfUsers(startKey);

  if (result.Count > 0) {
    const users = result.Items;

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

    // After batch of users is processed check how much time we have got left in this lambda
    // and if there are still users to process
    if ('LastEvaluatedKey' in result) {
      // If the remaining time is more than 5 minutes start a new batch
      if (context.getRemainingTimeInMillis() > 300000) {
        await processBatchOfUsers(
          event,
          context,
          unverifiedCognitoUsers,
          result.LastEvaluatedKey
        );
      } else {
        // Start new lambda function
        // First of all create a new event object with the start key
        const newEvent = Object.assign(event, {
          startKey: result.LastEvaluatedKey,
        });

        const req = {
          FunctionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
          InvocationType: 'Event',
          Payload: JSON.stringify(newEvent),
        };

        await lambda.invoke(req).promise();
        console.log(
          'invoked new lambda with startKey',
          result.LastEvaluatedKey
        );
      }
    }
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
