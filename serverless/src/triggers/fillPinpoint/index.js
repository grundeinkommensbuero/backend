const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const pinpoint = new AWS.Pinpoint(config);
const lambda = new AWS.Lambda();
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const { apiKey, apiSecret } = require('../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const { getSignatureListsOfUser } = require('../../shared/signatures');
const {
  getAllUnverifiedCognitoUsers,
  isVerified,
} = require('../../shared/users');

const zipCodeMatcher = require('../../shared/zipCodeMatcher');

const tableName = process.env.USERS_TABLE_NAME;

const createdSurveyAttributes = [];
const contactListId = '10234980';

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
    Limit: 500,
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
      const signatureListsResult = await getSignatureListsOfUser(
        user.cognitoId
      );

      user.signatureLists = signatureListsResult.Items;

      if (user.email) {
        // await updateEndpoint(user, verified);

        try {
          await createMailjetContact(user, verified);
        } catch (error) {
          console.log('already exists', error.statusCode);
        }

        try {
          await Promise.all([
            updateMailjetContact(user),
            updateMailjetSubscription(user, verified),
          ]);
        } catch (error) {
          console.log('error updating contact', error);
        }
      }

      count++;
    }

    console.log('updated count', count);

    // After batch of users is processed check how much time we have got left in this lambda
    // and if there are still users to process
    if ('LastEvaluatedKey' in result) {
      // If the remaining time is more than x minutes start a new batch
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

    return;
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

  const pledgeAttributes = [];
  const signatureCounts = [];

  if ('pledges' in user) {
    for (let pledge of user.pledges) {
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

        if ('signatureCount' in pledge && pledge.signatureCount) {
          signatureCounts.push(pledge.signatureCount.toString());
        }
      }
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
  if (typeof username !== 'undefined') {
    pinpointName = `&#160;${username}`;
  } else {
    pinpointName = '';
  }

  // Check if the user has already sent lists to us or scanned
  let listsReceived = false;
  let listsScanned = false;
  const signatureCampaigns = new Set();
  for (let list of user.signatureLists) {
    if ('received' in list && list.received.length > 0) {
      listsReceived = true;
    }

    if ('scannedByUser' in list && list.scannedByUser.length > 0) {
      listsScanned = true;
    }

    signatureCampaigns.add(list.campaign.code);
  }

  const params = {
    ApplicationId: projectId,
    EndpointId: `email-endpoint-${userId}`,
    EndpointRequest: {
      ChannelType: 'EMAIL',
      Address: email,
      Attributes: {
        // Referral: [referral], -> never really needed, and there's a limit to attributes
        Region: [region],
        // Pledge: pledgeAttributes,  -> never really needed, and there's a limit to attributes
        PledgeCampaignCode:
          'pledges' in user
            ? user.pledges.map(pledge => pledge.campaign.code)
            : [],

        SignaturesCampaignCode:
          signatureCampaigns.size > 0 ? Array.from(signatureCampaigns) : [],
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
        HasSentLists: [listsReceived ? 'Yes' : 'No'],
        HasScannedLists: [listsScanned ? 'Yes' : 'No'],
        PledgedSignatureCount: signatureCounts,
        Surveys:
          'surveys' in user
            ? user.surveys.map(survey => `${survey.code}:${survey.answer}`)
            : [],
      },
      EffectiveDate: createdAt,
      Location: {
        PostalCode: typeof zipCode !== 'undefined' ? zipCode : 'undefined',
        Region: region,
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

const updateMailjetContact = async ({
  cognitoId: userId, //rename cognitoId to userId while destructuring
  email,
  zipCode,
  username,
  migrated,
  signatureLists,
  scannedLists,
  signatureCampaigns,
  pledges,
  surveys,
}) => {
  const mailjetUser = {
    usernameWithSpace: '',
    downloadedListCount: 0,
    receivedSignatureCount: 0,
    scannedSignatureCount: 0,
    pledgedSignatureCount: 0,
    activeInBerlin: false,
    activeInSchleswigHolstein: false,
    activeInBrandenburg: false,
    activeInBremen: false,
    activeInHamburg: false,
    surveyParams: [],
    migratedFrom: 'nowhere',
  };

  // construct name with space before
  if (typeof username !== 'undefined') {
    mailjetUser.usernameWithSpace = `&#160;${username}`;
  }

  // Check how many signatures we already received from the user,
  // how many he*she has scanned and how many lists were downloaded

  for (let list of signatureLists) {
    if ('received' in list) {
      for (let scan of list.received) {
        mailjetUser.receivedSignatureCount += scan.count;
      }
    }

    mailjetUser.downloadedListCount += list.downloads;
  }

  // Use the scan record in the user object,
  // because in includes scans for anonymous lists or lists of other users
  if (typeof scannedLists !== 'undefined') {
    for (let scan of scannedLists) {
      mailjetUser.scannedSignatureCount += scan.count;
    }
  }

  if (typeof signatureCampaings !== 'undefined') {
    for (let campaign of signatureCampaigns) {
      checkIfActiveInState(mailjetUser, campaign.state);
    }
  }

  // Make use of utility function to match the state to a given zip code
  let region;
  if (typeof zipCode !== 'undefined') {
    region = zipCodeMatcher.getStateByZipCode(zipCode);
  }

  if (typeof region !== 'undefined') {
    checkIfActiveInState(mailjetUser, region.toLowerCase());
  }

  if (typeof pledges !== 'undefined') {
    for (let pledge of pledges) {
      if ('signatureCount' in pledge && pledge.signatureCount) {
        mailjetUser.pledgedSignatureCount = pledge.signatureCount;
      }
    }
  }

  if (typeof migrated !== 'undefined') {
    if (migrated.source === 'offline') {
      checkIfActiveInState(mailjetUser, migrated.campaign.state);
    }

    mailjetUser.migratedFrom = user.migrated.source;
  }

  if (typeof surveys !== 'undefined') {
    for (let survey of surveys) {
      // We need to strip the attribute of "-", because mailjet doesn't allow that
      const surveyName = `survey_${survey.code.replace('-', '')}`;

      // Create the attribute in mailjet
      try {
        await createMailjetAttribute(surveyName, 'str');
      } catch (error) {
        console.log('custom attribute already exists');
      }

      mailjetUser.surveyParams.push({
        Name: surveyName,
        Value: survey.answer,
      });
    }
  }

  const requestParams = {
    Data: [
      {
        Name: 'username_with_space',
        Value: mailjetUser.usernameWithSpace,
      },
      {
        Name: 'active_in_berlin',
        Value: mailjetUser.activeInBerlin,
      },
      {
        Name: 'active_in_schleswig_holstein',
        Value: mailjetUser.activeInSchleswigHolstein,
      },
      {
        Name: 'active_in_brandenburg',
        Value: mailjetUser.activeInBrandenburg,
      },
      {
        Name: 'active_in_hamburg',
        Value: mailjetUser.activeInHamburg,
      },
      {
        Name: 'active_in_bremen',
        Value: mailjetUser.activeInBremen,
      },
      {
        Name: 'migrated_from',
        Value: mailjetUser.migratedFrom,
      },
      {
        Name: 'pledged_signatures',
        Value: mailjetUser.pledgedSignatureCount,
      },
      {
        Name: 'received_signatures',
        Value: mailjetUser.receivedSignatureCount,
      },
      {
        Name: 'registered_signatures',
        Value: mailjetUser.scannedSignatureCount,
      },
      {
        Name: 'downloaded_lists',
        Value: mailjetUser.downloadedListCount,
      },
      {
        Name: 'user_id',
        Value: userId,
      },
      ...mailjetUser.surveyParams,
    ],
  };

  // We have to make two requests to update the contact data and add or remove user to/from contact list
  return mailjet
    .put('contactdata', { version: 'v3' })
    .id(email)
    .request(requestParams);
};

const updateMailjetSubscription = async (
  { email, newsletterConsent },
  verified
) => {
  return mailjet
    .post('contact', { version: 'v3' })
    .id(email)
    .action('managecontactslists')
    .request({
      ContactsLists: [
        {
          Action: newsletterConsent.value && verified ? 'addforce' : 'unsub',
          ListID: contactListId,
        },
      ],
    });
};

const createMailjetContact = async ({ email, newsletterConsent }, verified) => {
  return mailjet.post('contact', { version: 'v3' }).request({
    IsExcludedFromCampaigns: !(newsletterConsent.value && verified),
    Name: email,
    Email: email,
  });
};

const createMailjetAttribute = async (attribute, datatype) => {
  if (!createdSurveyAttributes.includes(attribute)) {
    createdSurveyAttributes.push(attribute);

    const requestParams = {
      Datatype: datatype,
      Name: attribute,
      NameSpace: 'static',
    };

    console.log({ requestParams });

    return mailjet
      .post('contactmetadata', { version: 'v3' })
      .request(requestParams);
  } else {
    console.log('already created survey attribute', attribute);
    return;
  }
};

const checkIfActiveInState = (mailjetUser, state) => {
  if (state === 'berlin') {
    mailjetUser.activeInBerlin = true;
  }

  if (state === 'schleswig-holstein') {
    mailjetUser.activeInSchleswigHolstein = true;
  }

  if (state === 'brandenburg') {
    mailjetUser.activeInBrandenburg = true;
  }

  if (state === 'bremen') {
    mailjetUser.activeInBremen = true;
  }

  if (state === 'hamburg') {
    mailjetUser.activeInHamburg = true;
  }
};
