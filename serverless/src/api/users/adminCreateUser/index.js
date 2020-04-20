const AWS = require('aws-sdk');
const randomBytes = require('crypto').randomBytes;
const sendMail = require('./sendMail');
const { errorResponse } = require('../../../shared/apiResponse');
const { constructCampaignId } = require('../../../shared/utils');
const { getUserByMail } = require('../../../shared/users');

const ddb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const {
  USERS_TABLE_NAME: usersTableName,
  USER_POOL_ID: userPoolId,
} = process.env;

const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

module.exports.handler = async event => {
  try {
    //get email from body,
    const { email, campaignCode } = JSON.parse(event.body);

    //if the listId is somehow undefined or null return error
    if (typeof email === 'undefined' || typeof campaignCode === 'undefined') {
      return errorResponse(
        400,
        'Email or campaign code not provided in request'
      );
    }

    //proceed by creating user
    try {
      const created = await createUserInCognito(email);
      const userId = created.User.Username;

      //confirm user (by setting fake password)
      await confirmUser(userId);

      //now create dynamo resource
      await createUserInDynamo(userId, email, campaignCode);

      try {
        //send email to to user to welcome them
        // TODO: reactivate sending of email
        // await sendMail(email, campaignCode, userId);

        // return message (created)
        return {
          statusCode: 201,
          headers: responseHeaders,
          isBase64Encoded: false,
          body: JSON.stringify({ userId }),
        };
      } catch (error) {
        console.log('Error while sending email', error);
        return errorResponse(500, 'Error while sending email', error);
      }
    } catch (error) {
      console.log('error', error);

      //user already exists
      if (error.code === 'UsernameExistsException') {
        try {
          const result = await getUserByMail(email);
          const user = result.Items[0];

          // Check if the user has newsletter consent set to true
          if (user.newsletterConsent.value) {
            return errorResponse(
              200,
              'User already exists and has newsletter consent true',
              error
            );
          } else {
            // if not, we want to update the user
            await updateNewsletterConsent(user.cognitoId);

            return errorResponse(
              200,
              'User already exists, but had newsletter consent false',
              error
            );
          }
        } catch (error) {
          console.log('Error while (maybe) updating newsletter consent', error);
          return errorResponse(
            500,
            'Error while (maybe) updating newsletter consent',
            error
          );
        }
      }

      //invalid email
      if (error.code === 'InvalidParameterException') {
        return errorResponse(400, 'Invalid email', error);
      }

      return errorResponse(500, 'Error while creating user', error);
    }
  } catch (error) {
    console.log('Error while parsing JSON', error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

//Create a new cognito user in our user pool
const createUserInCognito = email => {
  const params = {
    UserPoolId: userPoolId,
    Username: email,
    UserAttributes: [
      {
        Name: 'email_verified',
        Value: 'true',
      },
      {
        Name: 'email',
        Value: email,
      },
    ],
    MessageAction: 'SUPPRESS', //we don't want to send an "invitation mail"
  };
  return cognito.adminCreateUser(params).promise();
};

const createUserInDynamo = (userId, email, campaignCode) => {
  const timestamp = new Date().toISOString();

  const params = {
    TableName: usersTableName,
    Item: {
      cognitoId: userId,
      email: email,
      createdAt: timestamp,
      newsletterConsent: {
        value: true,
        timestamp,
      },
      migrated: {
        source: 'offline',
        //create a (nice to later work with) object, which campaign it is
        campaign: constructCampaignId(campaignCode),
      },
    },
  };
  return ddb.put(params).promise();
};

const updateNewsletterConsent = userId => {
  const timestamp = new Date().toISOString();

  const newsletterConsent = {
    value: true,
    timestamp: timestamp,
  };

  const params = {
    TableName: usersTableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET newsletterConsent = :newsletterConsent',
    ExpressionAttributeValues: {
      ':newsletterConsent': newsletterConsent,
    },
  };

  return ddb.update(params).promise();
};

//confirm user by setting a random password
//(need to do it this way, because user is in state force_reset_password)
const confirmUser = userId => {
  const password = getRandomString(20);
  const setPasswordParams = {
    UserPoolId: userPoolId,
    Username: userId,
    Password: password,
    Permanent: true,
  };
  //set fake password to confirm user
  return cognito.adminSetUserPassword(setPasswordParams).promise();
};

// Generates a random string (e.g. for generating random password)
const getRandomString = length => {
  return randomBytes(length).toString('hex');
};
