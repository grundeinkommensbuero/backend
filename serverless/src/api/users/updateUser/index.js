const AWS = require('aws-sdk');
const { getUser } = require('../../../shared/users');
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

      // Get ip address from request
      const ipAddress = event.requestContext.identity.sourceIp;

      // We need to get the donation info holding essential params
      // for the email to be send
      const donationInfo = await updateUser(
        userId,
        requestBody,
        result.Item,
        ipAddress
      );

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
    if (
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
    donation,
    confirmed,
    code,
    removeToken,
  },
  user,
  ipAddress
) => {
  const timestamp = new Date().toISOString();

  const data = {
    ':updatedAt': timestamp,
    ':username': username,
    ':zipCode': zipCode,
    ':city': city,
  };

  if (typeof newsletterConsent !== 'undefined') {
    data[':newsletterConsent'] = {
      value: newsletterConsent,
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
      typeof newsletterConsent !== 'undefined'
        ? 'newsletterConsent = :newsletterConsent,'
        : ''
    }
    ${typeof username !== 'undefined' ? 'username = :username,' : ''}
    ${typeof zipCode !== 'undefined' ? 'zipCode = :zipCode,' : ''}
    ${typeof city !== 'undefined' ? 'city = :city,' : ''}
    ${typeof donation !== 'undefined' ? 'donations = :donations,' : ''} 
    ${':confirmed' in data ? 'confirmed = :confirmed,' : ''} 
    ${user.source === 'bb-platform' ? 'updatedOnXbge = :updatedOnXbge,' : ''}
    updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  await ddb.update(params).promise();

  // Return stuff relevant for donation mail
  return donationInfo;
};

const constructDonationObject = (donation, user, timestamp) => {
  const { iban, recurring, ...rest } = donation;

  // We do not want to save the name of the gifted and giftgiver, if the donation is a gift
  delete rest.certificateReceiver;
  delete rest.certificateGiver;

  const normalizedIban = iban.replace(/ /g, '');

  // Get existing donation object of user to alter it
  const donations = 'donations' in user ? user.donations : {};
  let recurringDonationExisted = false;
  let id;
  let debitDate;

  // If the donation is recurring we want to set/update recurringDonation
  if (recurring) {
    if ('recurringDonation' in donations) {
      recurringDonationExisted = true;
      id = donations.recurringDonation.id;

      donations.recurringDonation = {
        iban: normalizedIban,
        updatedAt: timestamp,
        createdAt: donations.recurringDonation.createdAt,
        id,
        firstDebitDate: donations.recurringDonation.firstDebitDate,
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

  return { donations, id, recurringDonationExisted, debitDate };
};

// Computes the next debit date (15th of each months)
// Exceptions in the beginning: 22.12, 15.01, 25.01
const computeDebitDate = now => {
  const date = new Date(now);

  // If december 2020 before the 22th we set the debit date to 22th
  if (
    date.getFullYear() === 2020 &&
    date.getMonth() === 11 &&
    date.getDate() < 22
  ) {
    date.setDate(22);
  } else if (
    date.getFullYear() === 2021 &&
    date.getMonth() === 0 &&
    date.getDate() <= 24 &&
    date.getDate() >= 15
  ) {
    // If january between inlcuding 15th and 24th set to 25th
    date.setDate(25);
  } else {
    // If it is already passed the 14th we set it to next month
    if (now.getDate() >= 15) {
      date.setMonth(now.getMonth() + 1);
    }

    // Set to 15th
    date.setDate(15);
  }

  return date;
};

module.exports.computeDebitDate = computeDebitDate;
