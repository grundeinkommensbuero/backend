const AWS = require('aws-sdk');
const randomBytes = require('crypto').randomBytes;
const ddb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const usersTableName = process.env.TABLE_NAME_USERS;
const userPoolId = process.env.USER_POOL_ID;
const responseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

exports.handler = async event => {
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

      // return message (created)
      return {
        statusCode: 201,
        headers: responseHeaders,
        isBase64Encoded: false,
        body: JSON.stringify({ userId }),
      };
    } catch (error) {
      console.log('error', error);

      //user already exists
      if (error.code === 'UsernameExistsException') {
        return errorResponse(200, 'User already exists');
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

//Construct campaign identifier, so we know, from where the user comes
const constructCampaignId = campaignCode => {
  const campaign = {};
  if (typeof campaignCode !== 'undefined') {
    //we want to remove the last characters from the string (brandenburg-2 -> brandenburg)
    campaign.state = campaignCode.substring(0, campaignCode.length - 2);
    //...and take the last char and save it as number
    campaign.round = parseInt(
      campaignCode.substring(campaignCode.length - 1, campaignCode.length)
    );
    campaign.code = campaignCode;
  }
  return campaign;
};

// Generates a random string (e.g. for generating random password)
const getRandomString = length => {
  return randomBytes(length).toString('hex');
};

const errorResponse = (statusCode, message, error = null) => {
  let body;
  if (error !== null) {
    body = JSON.stringify({
      message: message,
      error: error,
    });
  } else {
    body = JSON.stringify({
      message: message,
    });
  }
  return {
    statusCode: statusCode,
    body: body,
    headers: responseHeaders,
    isBase64Encoded: false,
  };
};
