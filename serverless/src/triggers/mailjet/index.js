const { apiKey, apiSecret } = require('../../../mailjetConfig');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);
const fetch = require('node-fetch').default;
const zipCodeMatcher = require('../../shared/zipCodeMatcher');

const createdSurveyAttributes = [];
const contactListId = '10234980';

// This function creates new mailjet contact (if mailjet contact does not exist)
// and updated the user data and subscription status
const syncMailjetContact = async (user, verified) => {
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
};

// This function updates the user data in mailjet
const updateMailjetContact = async ({
  cognitoId: userId, // rename cognitoId to userId while destructuring
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

  for (const list of signatureLists) {
    if ('received' in list) {
      for (const scan of list.received) {
        mailjetUser.receivedSignatureCount += scan.count;
      }
    }

    if (list.downloads) {
      mailjetUser.downloadedListCount += list.downloads;
    }
  }

  // Use the scan record in the user object,
  // because in includes scans for anonymous lists or lists of other users
  if (typeof scannedLists !== 'undefined') {
    for (const scan of scannedLists) {
      mailjetUser.scannedSignatureCount += scan.count;
    }
  }

  if (typeof signatureCampaings !== 'undefined') {
    for (const campaign of signatureCampaigns) {
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
    for (const pledge of pledges) {
      if ('signatureCount' in pledge && pledge.signatureCount) {
        mailjetUser.pledgedSignatureCount = pledge.signatureCount;
      }
    }
  }

  if (typeof migrated !== 'undefined') {
    if (migrated.source === 'offline') {
      checkIfActiveInState(mailjetUser, migrated.campaign.state);
    }

    mailjetUser.migratedFrom = migrated.source;
  }

  if (typeof surveys !== 'undefined') {
    for (const survey of surveys) {
      // We need to strip the attribute of "-", because mailjet doesn't allow that
      const surveyName = `survey_${survey.code.replace('-', '')}`;

      // Create the attribute in mailjet
      try {
        await createMailjetAttribute(surveyName, 'str');
      } catch (error) {
        console.log('custom attribute already exists');
      }

      // If the mailjet user already contains this survey we want to overwrite it
      const index = mailjetUser.surveyParams.findIndex(
        element => element.Name === surveyName
      );
      if (index !== -1) {
        mailjetUser.surveyParams[index] = {
          Name: surveyName,
          Value: survey.answer,
        };
      } else {
        mailjetUser.surveyParams.push({
          Name: surveyName,
          Value: survey.answer,
        });
      }
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
    .id(encodeURIComponent(email))
    .request(requestParams);
};

// This function updates the subscription status
// by unsubbing or subbing to contact list
const updateMailjetSubscription = async (
  { email, newsletterConsent },
  verified
) => {
  return mailjet
    .post('contact', { version: 'v3' })
    .id(encodeURIComponent(email))
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

// This function creates a mailjet contact (will throw error if user already exists)
const createMailjetContact = async ({ email }) => {
  return mailjet.post('contact', { version: 'v3' }).request({
    // We unsub users not through this flag but by unsubbing from contact list
    IsExcludedFromCampaigns: false,
    Name: email,
    Email: email,
  });
};

// This function creates a new custom attribute (will throw error if exists)
const createMailjetAttribute = async (attribute, datatype) => {
  if (!createdSurveyAttributes.includes(attribute)) {
    createdSurveyAttributes.push(attribute);

    return mailjet.post('contactmetadata', { version: 'v3' }).request({
      Datatype: datatype,
      Name: attribute,
      NameSpace: 'static',
    });
  }

  console.log('already created survey attribute', attribute);
  return null;
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

const deleteMailjetContact = async email => {
  // First we need to get the mailjet contact because we need the id for deleting it
  const result = await mailjet
    .get('contact', { version: 'v3' })
    .id(encodeURIComponent(email))
    .request();

  console.log({ result });
  // We cannot use the mailjet package because it does not support delete contact yet
  const params = {
    method: 'delete',
    headers: {
      // We need to base64 encode the auth params
      Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString(
        'base64'
      )}`,
    },
  };

  const deleteResult = await fetch(
    `https://api.mailjet.com/v4/contacts/${result.body.Data[0].ID}`,
    params
  );

  console.log({ deleteResult });

  if (deleteResult.status !== 200) {
    throw new Error({
      status: deleteResult.status,
      error: 'Deleting contact unsuccessful',
    });
  }
};

module.exports = {
  syncMailjetContact,
  deleteMailjetContact,
  updateMailjetSubscription,
};
