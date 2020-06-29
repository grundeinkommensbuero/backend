const { getUserByMail } = require('../shared/users/getUsers');
const zipCodeMatcher = require('../shared/zipCodeMatcher');

const mailjet = require('node-mailjet').connect('', '');

const contactListId = '10234980';

const createdSurveyAttributes = [];

const testMailjet = async () => {
  try {
    const result = await getUserByMail('prod-users', 'vali_schagerl@web.de');
    const user = result.Items[0];
    user.signatureLists = [];

    const verified = true;

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
      console.log('error updating contact', error.statusCode);
    }
  } catch (error) {
    console.log(error);
  }
};

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

    mailjetUser.downloadedListCount += list.downloads;
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

  console.log('request', requestParams);

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

testMailjet();
