const AWS = require('aws-sdk');
const { apiKey, apiSecret } = require('../../../../mailjetConfig');
const { sendErrorMail } = require('../../../shared/errorHandling');
const { createLoginCode } = require('../../../shared/users');
const mailjet = require('node-mailjet').connect(apiKey, apiSecret);

const ddb = new AWS.DynamoDB.DocumentClient();
const cognito = new AWS.CognitoIdentityServiceProvider();
const tableName = process.env.USERS_TABLE_NAME;

const LINK_TIMEOUT_SECONDS = 20 * 60; // number of seconds the magic link should be valid

exports.handler = async event => {
  try {
    console.log('event', event);
    // Get challenge and timestamp from user attributes
    const [authChallenge, timestamp] = (
      event.request.privateChallengeParameters.challenge || ''
    ).split(',');

    const { userAttributes } = event.request;
    // Check if code is equal to what we expect and whether the link hasn't timed out...
    if (
      event.request.challengeAnswer === authChallenge &&
      Number(timestamp) > new Date().valueOf() / 1000 - LINK_TIMEOUT_SECONDS
    ) {
      console.log('answer correct');
      event.response.answerCorrect = true;

      // If answer is correct we want to check if email is not verified.
      // This might be the case, if user has changed their email address in their profile
      // but did not verify the new address.
      if (userAttributes.email_verified === 'false') {
        // In case it was not verified we want to "silently" verify it and update the email
        // in the user's dynamo record
        await verifyEmail(event.userPoolId, userAttributes.sub);
        await updateUser(userAttributes.sub, userAttributes.email);
      }
    } else if (
      event.request.challengeAnswer === 'resendCode' &&
      Number(timestamp) > new Date().valueOf() / 1000 - LINK_TIMEOUT_SECONDS
    ) {
      // In this case the code is still valid
      // We want to send the second mail via Mailjet as a fallback
      await sendEmail(userAttributes.email, authChallenge);
      event.response.answerCorrect = false;
    } else if (event.request.challengeAnswer === 'resendCode') {
      // In this case the code is not valid anymore, which is why we need to create a new one
      // Generate a new secret login code and mail it to the user
      const secretLoginCode = await createLoginCode({
        userId: userAttributes.sub,
        userPoolIdOverwrite: event.userPoolId,
      });

      // We want to send the second mail via Mailjet as a fallback
      await sendEmail(userAttributes.email, secretLoginCode);
    } else {
      console.log('answer false or timed out');
      event.response.answerCorrect = false;
    }
  } catch (error) {
    event.response.answerCorrect = false;
    console.log('Error verifying code', error);
    await sendErrorMail('verifying code', error);
  }

  return event;
};

const sendEmail = (email, code) => {
  return mailjet.post('send', { version: 'v3.1' }).request({
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: 1583518,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          code,
        },
      },
    ],
  });
};

const verifyEmail = (userPoolId, userId) => {
  const params = {
    UserPoolId: userPoolId,
    Username: userId,
    UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
  };

  return cognito.adminUpdateUserAttributes(params).promise();
};

const updateUser = (userId, email) => {
  const params = {
    TableName: tableName,
    Key: { cognitoId: userId },
    UpdateExpression: 'SET email = :email',
    ExpressionAttributeValues: {
      ':email': email,
    },
  };

  return ddb.update(params).promise();
};
