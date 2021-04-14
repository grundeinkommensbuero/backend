const AWS = require('aws-sdk');
const { getUser } = require('../../../shared/users');
const {
  getMunicipality,
  createUserMunicipalityLink,
  getUserMunicipalityLink,
} = require('../../../shared/municipalities');
const { errorResponse } = require('../../../shared/apiResponse');
const IBAN = require('iban');
const uuid = require('uuid/v4');
const sendMail = require('./sendMail');

const ddb = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.USERS_TABLE_NAME;

module.exports.handler = async event => {
  try {
    if (!isAuthorized(event)) {
      return errorResponse(401, 'No permission to override other user');
    }
    const requestBody = JSON.parse(event.body);

    if (!validateParams(event.pathParameters, requestBody)) {
      return errorResponse(400, 'One or more parameters are missing');
    }

    try {
      // check if there is a user with the passed user id
      const { userId } = event.pathParameters;
      const result = await getUser(userId);

      // if user does not have Item as property, there was no user found
      if (!('Item' in result) || typeof result.Item === 'undefined') {
        return errorResponse(404, 'No user found with the passed user id');
      }

      // Get ip address from request (needed for user confirmation)
      const ipAddress = event.requestContext.identity.sourceIp;

      // This array will be filled depending on which database calles will be made
      const promises = [];
      let municipalityName = null;
      const ags = requestBody.ags;

      let alreadySignedUpForMunicipality = true;
      // If ags was passed we also need to create the link
      // between municipality and user
      if (typeof ags !== 'undefined') {
        // Get municipality to fetch its name (to later save it in the communication settings)
        // and to check if munic even exists
        const municipalityResult = await getMunicipality(ags);

        if (!('Item' in municipalityResult)) {
          return errorResponse(404, 'Municipality not found');
        }

        // We need the name later for the setting of newsletter settings
        // and the population for updating the user municipality table
        const { population } = municipalityResult.Item;
        municipalityName = municipalityResult.Item.name;

        // Query user municipality table to check if user has already signed up for this munic
        const userMunicipalityResult = await getUserMunicipalityLink(
          requestBody.ags,
          userId
        );

        // If Item is result user has already signed up
        if (!('Item' in userMunicipalityResult)) {
          // Add creating the link between user and munic to the promises array
          // which will be executed afterwards
          promises.push(createUserMunicipalityLink(ags, userId, population));
          alreadySignedUpForMunicipality = false;
        }
      }

      promises.push(
        updateUser(
          userId,
          requestBody,
          result.Item,
          ipAddress,
          municipalityName,
          alreadySignedUpForMunicipality
        )
      );

      // We need to get the donation info holding essential params
      // for the email to be send
      const [donationInfo] = await Promise.all(promises);

      // Check if donation was updated to send an email
      if ('donation' in requestBody) {
        await sendMail(
          result.Item.email,
          requestBody.donation,
          donationInfo,
          // Take the username of the request body if exists
          // or the username of the user record if exists
          requestBody.certificateGiver || result.Item.username
        );
      }

      // updating user was successful, return appropriate json
      return {
        statusCode: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json',
        },
        isBase64Encoded: false,
      };
    } catch (error) {
      console.log(error);
      return errorResponse(500, 'Error updating user', error);
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

// Check if user id is in path params and request body is not empty
const validateParams = (pathParameters, requestBody) => {
  // Check if donation object is correct
  if ('donation' in requestBody) {
    const { donation } = requestBody;
    // If cancel flag is passed the other parameters don't matter
    if ('cancel' in donation) {
      if (typeof donation.cancel !== 'boolean') {
        return false;
      }
    } else if (
      !('amount' in donation) ||
      typeof donation.amount !== 'number' ||
      !('recurring' in donation) ||
      typeof donation.recurring !== 'boolean' ||
      !('firstName' in donation) ||
      !('lastName' in donation) ||
      !('iban' in donation) ||
      !IBAN.isValid(donation.iban)
    ) {
      return false;
    }
  }

  if ('customNewsletters' in requestBody) {
    const { customNewsletters } = requestBody;
    if (typeof customNewsletters !== 'object') {
      return false;
    }

    for (const newsletter of customNewsletters) {
      if (
        typeof newsletter.name !== 'string' ||
        typeof newsletter.value !== 'boolean' ||
        typeof newsletter.extraInfo !== 'boolean' ||
        typeof newsletter.timestamp !== 'string'
      ) {
        return false;
      }
    }
  }

  return 'userId' in pathParameters && Object.keys(requestBody).length !== 0;
};

const isAuthorized = event => {
  return (
    event.requestContext.authorizer.claims.sub === event.pathParameters.userId
  );
};

const updateUser = async (
  userId,
  {
    username,
    zipCode,
    city,
    newsletterConsent,
    customNewsletters,
    reminderMails,
    donation,
    confirmed,
    code,
    removeToken,
    ags,
    store,
  },
  user,
  ipAddress,
  municipalityName,
  alreadySignedUpForMunicipality
) => {
  const timestamp = new Date().toISOString();

  // If custom newsletters are part of request we use that value, if not
  // we build our own array (adding to the existing one) of custom newsletters depending on the ags
  // (but only if newsletter consent was passed as true)
  let customNewslettersArray;
  if (typeof customNewsletters !== 'undefined') {
    customNewslettersArray = customNewsletters;
  } else if (
    typeof ags !== 'undefined' &&
    newsletterConsent &&
    !alreadySignedUpForMunicipality
  ) {
    // If array already exists, use that array
    customNewslettersArray = user.customNewsletters || [];

    // Check if the municipality is already included in the array
    const foundIndex = customNewslettersArray.findIndex(
      newsletter => newsletter.ags === ags
    );

    if (foundIndex !== -1) {
      customNewslettersArray[foundIndex].value = true;
    } else {
      customNewslettersArray.push({
        name: municipalityName,
        ags,
        value: true,
        extraInfo: false,
        timestamp,
      });
    }
  }

  // If the store object was passed we want to get the current store object
  // of the user and adjust it accordingly
  let newStore;
  if (typeof store !== 'undefined') {
    // Keep all existing keys, add new ones, and overwrite
    // if keys are in existing store and in request
    newStore = { ...user.store, ...store };
  }

  const data = {
    ':updatedAt': timestamp,
    ':username': username,
    ':zipCode': zipCode,
    ':city': city,
    ':customNewsletters': customNewslettersArray,
    ':store': newStore,
  };

  if (typeof newsletterConsent !== 'undefined') {
    // If user is signing up for municipality, we want to keep
    // the old newsletter consent if it was true
    if (
      typeof ags === 'undefined' ||
      (typeof ags !== 'undefined' && !user.newsletterConsent.value)
    ) {
      data[':newsletterConsent'] = {
        value: newsletterConsent,
        timestamp,
      };
    }
  }

  if (typeof reminderMails !== 'undefined') {
    data[':reminderMails'] = {
      value: reminderMails,
      timestamp,
    };
  }

  let donationInfo;
  // Check if donation object was passed to alter iban
  if (typeof donation !== 'undefined') {
    donationInfo = constructDonationObject(donation, user, timestamp);
    data[':donations'] = donationInfo.donations;
  }

  // We only want to confirm the user  if not yet confirmed
  if (
    ('confirmed' in user && !user.confirmed.value) ||
    !('confirmed' in user)
  ) {
    // Check if confirmed flag was passed and is true
    if (confirmed) {
      // For double opt in we also need to save ip address and code
      // used for verification
      data[':confirmed'] = {
        value: true,
        timestamp,
        code,
        ipAddress,
      };
    }
  }

  // We want to check if the user was created at the bb platform.
  // In that case we want to set a flag that the user was updated on
  // expedition-grundeinkommen.de
  if (user.source === 'bb-platform') {
    data[':updatedOnXbge'] = true;
  }

  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: `
    ${removeToken ? 'REMOVE customToken' : ''}
    SET ${
      ':newsletterConsent' in data
        ? 'newsletterConsent = :newsletterConsent,'
        : ''
    }
    ${
      typeof reminderMails !== 'undefined'
        ? 'reminderMails = :reminderMails,'
        : ''
    }
    ${
      typeof customNewslettersArray !== 'undefined'
        ? 'customNewsletters = :customNewsletters,'
        : ''
    }
    ${typeof username !== 'undefined' ? 'username = :username,' : ''}
    ${typeof zipCode !== 'undefined' ? 'zipCode = :zipCode,' : ''}
    ${typeof city !== 'undefined' ? 'city = :city,' : ''}
    ${typeof donation !== 'undefined' ? 'donations = :donations,' : ''}
    ${typeof store !== 'undefined' ? '#store = :store,' : ''} 
    ${':confirmed' in data ? 'confirmed = :confirmed,' : ''} 
    ${user.source === 'bb-platform' ? 'updatedOnXbge = :updatedOnXbge,' : ''}
    updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  if (typeof store !== 'undefined') {
    params.ExpressionAttributeNames = { '#store': 'store' };
  }

  await ddb.update(params).promise();

  // Return stuff relevant for donation mail
  return donationInfo;
};

const constructDonationObject = (donation, user, timestamp) => {
  const { iban, recurring, yearly, ...rest } = donation;

  // Get existing donation object of user to alter it
  const donations = 'donations' in user ? user.donations : {};
  let recurringDonationExisted = false;
  let id;
  let debitDate;

  // If cancel flag was passed the recurring donation should be cancelled
  if (donation.cancel) {
    // We just set a timestamp
    donations.recurringDonation.cancelledAt = timestamp;
  } else {
    const normalizedIban = iban.replace(/ /g, '');

    if (recurring) {
      // If the donation is recurring we want to set/update recurringDonation

      if ('recurringDonation' in donations) {
        recurringDonationExisted = true;
        id = donations.recurringDonation.id;

        donations.recurringDonation = {
          iban: normalizedIban,
          updatedAt: timestamp,
          createdAt: donations.recurringDonation.createdAt,
          id,
          firstDebitDate: donations.recurringDonation.firstDebitDate,
          yearly,
          ...rest,
        };
      } else {
        id = uuid().slice(0, -4); // we need to make id shorter
        debitDate = computeDebitDate(new Date());

        donations.recurringDonation = {
          iban: normalizedIban,
          createdAt: timestamp,
          firstDebitDate: debitDate.toISOString(),
          id,
          yearly,
          ...rest,
        };
      }
    } else {
      id = uuid().slice(0, -4); // we need to make id shorter
      debitDate = computeDebitDate(new Date());

      // Otherwise we add the one time donation to an array
      const onetimeDonation = {
        iban: normalizedIban,
        createdAt: timestamp,
        debitDate: debitDate.toISOString(),
        id,
        ...rest,
      };

      if ('onetimeDonations' in donations) {
        donations.onetimeDonations.push(onetimeDonation);
      } else {
        donations.onetimeDonations = [onetimeDonation];
      }
    }
  }

  return { donations, id, recurringDonationExisted, debitDate };
};

// Computes the next debit date (15th of each months)
// Exceptions in 2021: 03/04
const computeDebitDate = now => {
  const date = new Date(now);

  // If before the 4th of march we set the debit date to 4th
  if (date < new Date('2021-03-04')) {
    date.setMonth(2);
    date.setDate(4);
  } else {
    // If it is already passed the 11th at 3 pm we set it to next month
    if (now.getDate() > 11 || (now.getDate() === 11 && now.getHours() > 14)) {
      date.setMonth(now.getMonth() + 1);
    }

    // Set to 15th
    date.setDate(15);
  }

  return date;
};

module.exports.computeDebitDate = computeDebitDate;
