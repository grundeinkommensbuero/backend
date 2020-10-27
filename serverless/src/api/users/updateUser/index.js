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

    console.log('request body', requestBody);

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

      // Check if donation was updated to send an email
      if ('donation' in requestBody) {
        // Check if there already was a recurring donation
        const recurringDonationExisted =
          'donations' in result.Item &&
          'recurringDonation' in result.Item.donations;

        await sendMail(
          result.Item.email,
          requestBody.donation,
          recurringDonationExisted
        );
      }

      await updateUser(userId, requestBody, result.Item);

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

const updateUser = (
  userId,
  { username, zipCode, city, newsletterConsent, donation, confirmed },
  user
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

  // Check if donation object was passed to alter iban
  if (typeof donation !== 'undefined') {
    data[':donations'] = constructDonationObject(donation, user, timestamp);
  }

  // Check if confirmed flag was passed and is true
  if (confirmed) {
    data[':confirmed'] = {
      value: true,
      timestamp,
    };
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
    SET ${
      typeof newsletterConsent !== 'undefined'
        ? 'newsletterConsent = :newsletterConsent,'
        : ''
    }
    ${typeof username !== 'undefined' ? 'username = :username,' : ''}
    ${typeof zipCode !== 'undefined' ? 'zipCode = :zipCode,' : ''}
    ${typeof city !== 'undefined' ? 'city = :city,' : ''}
    ${typeof donation !== 'undefined' ? 'donations = :donations,' : ''} 
    ${confirmed ? 'confirmed = :confirmed,' : ''} 
    ${user.source === 'bb-platform' ? 'updatedOnXbge = :updatedOnXbge,' : ''}
    updatedAt = :updatedAt
    `,
    ExpressionAttributeValues: data,
    ReturnValues: 'UPDATED_NEW',
  };

  return ddb.update(params).promise();
};

const constructDonationObject = (donation, user, timestamp) => {
  const { iban, recurring, ...rest } = donation;
  const normalizedIban = iban.replace(/ /g, '');

  // Get existing donation object of user to alter it
  const donations = 'donations' in user ? user.donations : {};

  // If the donation is recurring we want to set/update recurringDonation
  if (recurring) {
    if ('recurringDonation' in donations) {
      donations.recurringDonation = {
        iban: normalizedIban,
        updatedAt: timestamp,
        createdAt: donations.recurringDonation.createdAt,
        ...rest,
      };
    } else {
      donations.recurringDonation = {
        iban: normalizedIban,
        createdAt: timestamp,
        ...rest,
      };
    }
  } else {
    // Otherwise we add the one time donation to an array
    const onetimeDonation = {
      iban: normalizedIban,
      createdAt: timestamp,
      id: uuid(),
      ...rest,
    };

    if ('onetimeDonations' in donations) {
      donations.onetimeDonations.push(onetimeDonation);
    } else {
      donations.onetimeDonations = [onetimeDonation];
    }
  }

  return donations;
};
