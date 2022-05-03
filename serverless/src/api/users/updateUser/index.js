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
const sendLotteryMail = require('./sendLotteryMail');
const { computeDebitDate } = require('./computeDebitDate');
const {
  validateZipCode,
  formatPhoneNumber,
  validatePhoneNumber,
  generateRandomId,
  validateCustomNewsletters,
  validateWantsToCollect,
} = require('../../../shared/utils');

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
      const [{ donationInfo, lotteryInfo }] = await Promise.all(promises);

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

      if ('lottery' in requestBody) {
        await sendLotteryMail(
          result.Item.email,
          lotteryInfo,
          // Take the username of the request body if exists
          // or the username of the user record if exists
          requestBody.username || result.Item.username
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

  if (
    'customNewsletters' in requestBody &&
    !validateCustomNewsletters(requestBody.customNewsletters)
  ) {
    return false;
  }

  if ('listFlow' in requestBody && typeof requestBody.listFlow !== 'object') {
    return false;
  }

  if ('zipCode' in requestBody && !validateZipCode(requestBody.zipCode)) {
    return false;
  }

  if (
    'phoneNumber' in requestBody &&
    !validatePhoneNumber(formatPhoneNumber(requestBody.phoneNumber))
  ) {
    return false;
  }

  if (
    'wantsToCollect' in requestBody &&
    !validateWantsToCollect(requestBody.wantsToCollect)
  ) {
    return false;
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
    email,
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
    lottery,
    store,
    listFlow,
    phoneNumber,
    wantsToCollect,
    extraInfo,
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
    // If extra info was passed we want to override the newsletter settings, even
    // if they are already signed up to municipality
    (!alreadySignedUpForMunicipality || extraInfo)
  ) {
    // If array already exists, use that array
    customNewslettersArray = user.customNewsletters || [];

    // Check if the municipality is already included in the array
    const foundIndex = customNewslettersArray.findIndex(
      newsletter => newsletter.ags === ags
    );

    if (foundIndex !== -1) {
      customNewslettersArray[foundIndex].value = true;
      if (extraInfo) {
        customNewslettersArray[foundIndex].extraInfo = true;
      }
    } else {
      customNewslettersArray.push({
        name: municipalityName,
        ags,
        value: true,
        extraInfo: extraInfo || false,
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

  // Same as with the store we keep existing keys for list flow, add or overwrite
  let newListFlow;
  if (typeof listFlow !== 'undefined') {
    newListFlow = { ...user.listFlow, ...listFlow };
  }

  let newWantsToCollect;
  if (typeof wantsToCollect !== 'undefined') {
    if ('wantsToCollect' in user) {
      newWantsToCollect = user.wantsToCollect;
      newWantsToCollect.updatedAt = timestamp;
    } else {
      newWantsToCollect = { createdAt: timestamp };
    }

    if ('meetup' in wantsToCollect) {
      if (!('meetups' in newWantsToCollect)) {
        newWantsToCollect.meetups = [];
      }

      newWantsToCollect.meetups.push({
        ...wantsToCollect.meetup,
        timestamp,
      });
    }

    if (wantsToCollect.inGeneral) {
      newWantsToCollect.inGeneral = true;
    }

    if ('question' in wantsToCollect) {
      newWantsToCollect.question = wantsToCollect.question;
    }
  }

  const data = {
    ':email': email,
    ':updatedAt': timestamp,
    ':username': username,
    ':zipCode': typeof zipCode !== 'undefined' ? zipCode.toString() : undefined, // Parse to string if is number
    ':city': city,
    ':customNewsletters': customNewslettersArray,
    ':store': newStore,
    ':listFlow': newListFlow,
    ':wantsToCollect': newWantsToCollect,
    ':phoneNumber':
      typeof phoneNumber !== 'undefined'
        ? formatPhoneNumber(phoneNumber) // Format it to all digit
        : undefined,
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

  if (typeof lottery !== 'undefined') {
    data[':lottery'] = { timestamp, year: lottery, id: generateRandomId(5) };
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
    ${typeof email !== 'undefined' ? 'email = :email,' : ''}
    ${typeof username !== 'undefined' ? 'username = :username,' : ''}
    ${typeof zipCode !== 'undefined' ? 'zipCode = :zipCode,' : ''}
    ${typeof city !== 'undefined' ? 'city = :city,' : ''}
    ${typeof donation !== 'undefined' ? 'donations = :donations,' : ''}
    ${typeof store !== 'undefined' ? '#store = :store,' : ''} 
    ${typeof listFlow !== 'undefined' ? 'listFlow = :listFlow,' : ''} 
    ${
      typeof wantsToCollect !== 'undefined'
        ? 'wantsToCollect = :wantsToCollect,'
        : ''
    } 
    ${typeof lottery !== 'undefined' ? 'lottery = :lottery,' : ''} 
    ${':confirmed' in data ? 'confirmed = :confirmed,' : ''} 
    ${typeof phoneNumber !== 'undefined' ? 'phoneNumber = :phoneNumber,' : ''}
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
  return { donationInfo, lotteryInfo: data[':lottery'] };
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
