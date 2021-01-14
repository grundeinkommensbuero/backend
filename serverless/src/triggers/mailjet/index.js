let mailjet;

const { apiKey, apiSecret } = require('../../../mailjetConfig');

// Mailjet config should only be provided optionally
if (apiKey && apiSecret) {
  mailjet = require('node-mailjet').connect(apiKey, apiSecret);
} else {
  console.log('No mailjet config provided');
}

const fetch = require('node-fetch').default;

const createdSurveyAttributes = [];
const contactListIdXbge = '10234980';
const contactListIdBBPlatform = '10240805';

// This function creates new mailjet contact (if mailjet contact does not exist)
// and updated the user data and subscription status
const syncMailjetContact = async (user, verified) => {
  try {
    await createMailjetContact(user, verified);
  } catch (error) {
    console.log('already exists', error.statusCode);
  }

  try {
    await updateMailjetContact(user);

    if (user.source !== 'bb-platform') {
      await updateMailjetSubscription(user, verified, contactListIdXbge);
    } else {
      await updateMailjetSubscription(user, verified, contactListIdBBPlatform);
    }
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
  pledges,
  surveys,
  customNewsletters,
  newsletterConsent,
}) => {
  const mailjetUser = {
    usernameWithSpace: '',
    downloadedListCount: 0,
    receivedSignatureCount: 0,
    scannedSignatureCount: 0,
    pledgedSignatureCount: 0,
    surveyParams: [],
    migratedFrom: 'nowhere',
    username: username || '',
    activeUser: false,
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

  if (typeof pledges !== 'undefined') {
    for (const pledge of pledges) {
      if ('signatureCount' in pledge && pledge.signatureCount) {
        mailjetUser.pledgedSignatureCount = pledge.signatureCount;
      }
    }
  }

  if (typeof migrated !== 'undefined') {
    mailjetUser.migratedFrom = migrated.source;
  }

  // Because mailjet does now allow arrays we need to handle
  // the newsletter subscription via a concatenated string
  const { newsletterString, extraInfo } = createNewsletterString(
    customNewsletters
  );
  mailjetUser.newsletterString = newsletterString;
  mailjetUser.activeUser = extraInfo;

  console.log('newsletter string', mailjetUser.newsletterString);

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
        Name: 'username',
        Value: mailjetUser.username,
      },
      {
        Name: 'subscribed_in',
        Value: mailjetUser.newsletterString,
      },
      {
        Name: 'subscribed_to_general',
        Value: newsletterConsent.value,
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
      {
        Name: 'active_user',
        Value: mailjetUser.activeUser,
      },
      ...mailjetUser.surveyParams,
    ],
  };

  if (typeof zipCode !== 'undefined') {
    requestParams.Data.push({
      Name: 'user_address_zip',
      Value: parseInt(zipCode, 10),
    });
  }

  await mailjet
    .put('contactdata', { version: 'v3' })
    .id(encodeURIComponent(email))
    .request(requestParams);

  return mailjetUser;
};

// This function updates the subscription status
// by unsubbing or subbing to contact list
const updateMailjetSubscription = async (
  { email },
  verified,
  contactListId
) => {
  return mailjet
    .post('contact', { version: 'v3' })
    .id(encodeURIComponent(email))
    .action('managecontactslists')
    .request({
      ContactsLists: [
        {
          Action: verified ? 'addforce' : 'unsub',
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

  return null;
};

// Create concatenated string for subscribed newsletters
// Also checks if extraInfo flag is set to true
const createNewsletterString = customNewsletters => {
  let newsletterString = '';
  let extraInfo = false;

  if (typeof customNewsletters !== 'undefined') {
    for (const newsletter of customNewsletters) {
      newsletterString += `${newsletter.name}, `;

      if (newsletter.extraInfo) {
        extraInfo = true;
      }
    }

    // Strip last two chars (, )
    newsletterString = newsletterString.slice(0, -2);
  }

  return { newsletterString, extraInfo };
};

// This functions deletes the mailjet contact.
// We cannot use the mailjet package because it does not provide
// that yet.
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
