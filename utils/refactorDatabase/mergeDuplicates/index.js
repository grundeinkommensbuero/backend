const { DynamoDBDocument } = require('@aws-sdk/lib-dynamodb');
const { DynamoDB } = require('@aws-sdk/client-dynamodb');
const { getAllUsers, getUserByMail } = require('../../shared/users/getUsers');
const {
  deleteUserInCognito,
  deleteUserInDynamo,
  deleteUserInPinpoint,
} = require('../../shared/users/deleteUsers');
const {
  getSignatureListsOfUser,
  getScannedByUserSignatureLists,
} = require('../../shared/signatures');
const CONFIG = require('../../config');

const config = { region: 'eu-central-1' };
const ddb = DynamoDBDocument.from(new DynamoDB(config));
const usersTableName = CONFIG.PROD_USERS_TABLE_NAME;
const signaturesTableName = CONFIG.PROD_SIGNATURES_TABLE_NAME;
const userPoolId = CONFIG.PROD_USER_POOL_ID;

const mergeDuplicates = async () => {
  try {
    const users = await getAllUsers(usersTableName);

    for (const user of users) {
      if (user.email) {
        try {
          const lowercaseEmail = user.email.toLowerCase();

          if (lowercaseEmail !== user.email) {
            console.log('about to merge user', user.email);
            const result = await getUserByMail(usersTableName, lowercaseEmail);

            await mergeUser(result.Items[0], user);
            await deleteUser(user.cognitoId);
          }
        } catch (error) {
          console.log('Error with user', user.email);
          throw error;
        }
      }
    }
  } catch (error) {
    console.log('Error merging duplicates', error);
  }
};

const mergeUser = async (user, duplicate) => {
  await updateUserRecord(user, duplicate);

  await updateSignatureLists(user.cognitoId, duplicate.cognitoId);
};

const deleteUser = async userId => {
  return Promise.all([
    deleteUserInDynamo(usersTableName, userId),
    deleteUserInCognito(userPoolId, userId),
    deleteUserInPinpoint(userId),
  ]);
};

const updateUserRecord = (user, duplicate) => {
  let pledges;

  if (user.pledges) {
    pledges = user.pledges;
    if (duplicate.pledges) {
      pledges.push(...duplicate.pledges);
    }
  } else {
    pledges = duplicate.pledges;
  }

  let scannedLists;
  if (user.scannedLists) {
    scannedLists = user.scannedLists;

    if (duplicate.scannedLists) {
      scannedLists.push(...duplicate.scannedLists);
    }
  } else {
    scannedLists = duplicate.scannedLists;
  }

  let signatureCampaigns;
  if (user.signatureCampaigns) {
    signatureCampaigns = user.signatureCampaigns;

    if (duplicate.signatureCampaigns) {
      for (const campaign of duplicate.signatureCampaigns) {
        if (!signatureCampaigns.includes(campaign)) {
          signatureCampaigns.push(campaign);
        }
      }
    }
  } else {
    signatureCampaigns = duplicate.signatureCampaigns;
  }

  let surveys;
  if (user.surveys) {
    surveys = user.surveys;

    if (duplicate.surveys) {
      for (const duplicateSurvey of duplicate.surveys) {
        if (
          surveys.findIndex(survey => survey.code === duplicateSurvey.code) ===
          -1
        ) {
          surveys.push(duplicateSurvey);
        }
      }
    }
  } else {
    surveys = duplicate.surveys;
  }

  let city;
  if (user.city && !duplicate.city) {
    city = user.city;
  } else if (!user.city && duplicate.city) {
    city = duplicate.city;
  } else if (user.city && duplicate.city) {
    if (new Date(user.createdAt) > new Date(duplicate.createdAt)) {
      city = user.city;
    } else {
      city = duplicate.city;
    }
  }

  let zipCode;
  if (user.zipCode && !duplicate.zipCode) {
    zipCode = user.zipCode;
  } else if (!user.zipCode && duplicate.zipCode) {
    zipCode = duplicate.zipCode;
  } else if (user.zipCode && duplicate.zipCode) {
    if (new Date(user.createdAt) > new Date(duplicate.createdAt)) {
      zipCode = user.zipCode;
    } else {
      zipCode = duplicate.zipCode;
    }
  }

  let username;
  if (user.username && !duplicate.username) {
    username = user.username;
  } else if (!user.username && duplicate.username) {
    username = duplicate.username;
  } else if (user.username && duplicate.username) {
    if (new Date(user.createdAt) > new Date(duplicate.createdAt)) {
      username = user.username;
    } else {
      username = duplicate.username;
    }
  }

  let updatedAt;
  if (user.updatedAt && !duplicate.updatedAt) {
    updatedAt = user.updatedAt;
  } else if (!user.updatedAt && duplicate.updatedAt) {
    updatedAt = duplicate.updatedAt;
  } else if (user.updatedAt && duplicate.updatedAt) {
    if (new Date(user.updatedAt) > new Date(duplicate.updatedAt)) {
      updatedAt = user.updatedAt;
    } else {
      updatedAt = duplicate.updatedAt;
    }
  }

  let migrated;
  if (user.migrated && !duplicate.migrated) {
    migrated = user.migrated;
  } else if (!user.migrated && duplicate.migrated) {
    migrated = duplicate.migrated;
  } else if (user.migrated && duplicate.migrated) {
    if (new Date(user.createdAt) < new Date(duplicate.createdAt)) {
      migrated = user.migrated;
    } else {
      migrated = duplicate.migrated;
    }
  }

  let referral;
  if (user.referral && !duplicate.referral) {
    referral = user.referral;
  } else if (!user.referral && duplicate.referral) {
    referral = duplicate.referral;
  } else if (user.referral && duplicate.referral) {
    if (new Date(user.createdAt) < new Date(duplicate.createdAt)) {
      referral = user.referral;
    } else {
      referral = duplicate.referral;
    }
  }

  let newsletterConsent;
  if (user.newsletterConsent.value && !duplicate.newsletterConsent.value) {
    newsletterConsent = user.newsletterConsent;
    console.log('difference in newsletter consent', duplicate.email);
  } else if (
    !user.newsletterConsent.value &&
    duplicate.newsletterConsent.value
  ) {
    newsletterConsent = duplicate.newsletterConsent;
    console.log('difference in newsletter consent', duplicate.email);
  } else {
    newsletterConsent = user.newsletterConsent;
  }

  const createdAt =
    new Date(user.createdAt) < new Date(duplicate.createdAt)
      ? user.createdAt
      : duplicate.createdAt;

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: user.cognitoId },
    UpdateExpression: `
    set ${city ? 'city = :city,' : ''}
    ${username ? 'username = :username,' : ''}
    ${zipCode ? 'zipCode = :zipCode,' : ''}
    ${pledges ? 'pledges = :pledges,' : ''}
    ${newsletterConsent ? 'newsletterConsent = :newsletterConsent,' : ''}
    ${referral ? 'referral = :referral,' : ''}
    ${migrated ? 'migrated = :migrated,' : ''}
    ${updatedAt ? 'updatedAt = :updatedAt,' : ''}
    ${scannedLists ? 'scannedLists = :scannedLists,' : ''}
    ${surveys ? 'surveys = :surveys,' : ''}
    ${signatureCampaigns ? 'signatureCampaings = :signatureCampaigns,' : ''}
    ${createdAt ? 'createdAt = :createdAt' : ''}
    `,
    ExpressionAttributeValues: {
      ':city': city,
      ':username': username,
      ':zipCode': zipCode,
      ':pledges': pledges,
      ':newsletterConsent': newsletterConsent,
      ':referral': referral,
      ':migrated': migrated,
      ':updatedAt': updatedAt,
      ':createdAt': createdAt,
      ':scannedLists': scannedLists,
      ':surveys': surveys,
      ':signatureCampaigns': signatureCampaigns,
    },
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params);
};

const updateSignatureLists = async (userId, duplicateId) => {
  const result = await getSignatureListsOfUser(
    signaturesTableName,
    duplicateId
  );

  for (const list of result.Items) {
    await updateUserIdInSignatureList(list.id, userId);

    console.log('updated user id in list', list.id, userId);
  }

  const scannedSignatureLists = await getScannedByUserSignatureLists(
    signaturesTableName
  );

  for (const list of scannedSignatureLists) {
    let scansWereChanged = false;
    const scans = list.scannedByUser;

    for (const scan of scans) {
      if (scan.userId === duplicateId) {
        scan.userId = userId;
        scansWereChanged = true;
      }
    }

    if (scansWereChanged) {
      await updateScansInSignatureList(list.id, scans);

      console.log('updated scans in list', list.id);
    }
  }
};

const updateUserIdInSignatureList = (id, userId) => {
  const params = {
    TableName: signaturesTableName,
    Key: { id },
    UpdateExpression: 'SET userId = :userId',
    ExpressionAttributeValues: { ':userId': userId },
  };

  return ddb.update(params);
};

const updateScansInSignatureList = (id, scans) => {
  const params = {
    TableName: signaturesTableName,
    Key: { id },
    UpdateExpression: 'SET scannedByUser = :scans',
    ExpressionAttributeValues: { ':scans': scans },
  };

  return ddb.update(params);
};

mergeDuplicates();
