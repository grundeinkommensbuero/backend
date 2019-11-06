//const randomBytes = require('crypto').randomBytes;

const AWS = require('aws-sdk');

const ddb = new AWS.DynamoDB.DocumentClient();

const tableName = process.env.TABLE_NAME;

exports.handler = async event => {
  try {
    const requestBody = JSON.parse(event.body);

    //check if there is a user with the passed user id
    try {
      const date = new Date();
      const timestamp = date.toISOString();
      console.log('request body', requestBody);
      if (!validateParams(requestBody)) {
        return errorResponse(400, 'One or more parameters are missing', null);
      }

      const userId = requestBody.userId;
      const user = await getUser(requestBody.userId);
      console.log('user', user);
      //if user does not have Item as property, there was no user found
      if (!('Item' in user) || typeof user.Item === 'undefined') {
        return errorResponse(
          400,
          'No user found with the passed user id',
          null
        );
      }

      try {
        await savePledge(userId, timestamp, requestBody);
        //saving pledge was successfull, return appropriate json
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
        return errorResponse(500, 'Error saving pledge', error);
      }
    } catch (error) {
      console.log(error);
      return errorResponse(
        500,
        'Error while getting user from users table',
        error
      );
    }
  } catch (error) {
    console.log(error);
    return errorResponse(400, 'JSON Parsing was not successful', error);
  }
};

const savePledge = (userId, timestamp, requestBody) => {
  //check which pledge it is (e.g. pledgeId='brandenburg')
  let pledgeKey;
  if (requestBody.pledgeId === 'brandenburg') {
    pledgeKey = 'pledge-brandenburg-1';
  } else {
    pledgeKey = 'pledge';
  }

  const data = {
    ':pledge': {
      signatureCount: requestBody.signatureCount,
      createdAt: timestamp,
    },
    /* not needed for slimmer form
    ':wouldPrintAndSendSignatureLists':
      requestBody.wouldPrintAndSendSignatureLists,
    ':wouldDonate': requestBody.wouldDonate,
    ':wouldPutAndCollectSignatureLists':
      requestBody.wouldPutAndCollectSignatureLists,
    ':wouldCollectSignaturesInPublicSpaces':
      requestBody.wouldCollectSignaturesInPublicSpaces,
      */
    /* not needed for slimmer form
     ':wouldEngageCustom':
       requestBody.wouldEngageCustom !== undefined
         ? requestBody.wouldEngageCustom
         : 'empty',
         */
    ':zipCode': 'zipCode' in requestBody ? requestBody.zipCode : 'empty',
    ':username':
      'name' in requestBody && requestBody.name !== ''
        ? requestBody.name
        : 'empty',
    ':referral': 'referral' in requestBody ? requestBody.referral : 'empty',
    ':newsletterConsent': {
      value: requestBody.newsletterConsent,
      timestamp: timestamp,
    },
  };

  return ddb
    .update({
      TableName: tableName,
      Key: { cognitoId: userId },
      /* not needed for slimmer form
      UpdateExpression: `set pledge.signatureCount = :signatureCount, 
      pledge.wouldPrintAndSendSignatureLists = :wouldPrintAndSendSignatureLists, 
      pledge.wouldDonate = :wouldDonate,
      pledge.wouldEngageCustom = :wouldEngageCustom,
      pledge.wouldPutAndCollectSignatureLists = :wouldPutAndCollectSignatureLists,
      pledge.wouldCollectSignaturesInPublicSpaces = :wouldCollectSignaturesInPublicSpaces,
      zipCode = :zipCode,
      username = :username,
      pledge.createdAt = :createdAt,
      referral = :referral,
      newsletterConsent = :newsletterConsent
      `,
      */
      UpdateExpression: `
      set #pledgeKey = :pledge,
      zipCode = :zipCode,
      username = :username,
      referral = :referral,
      newsletterConsent = :newsletterConsent
      `,
      ExpressionAttributeValues: data,
      ExpressionAttributeNames: {
        '#pledgeKey': pledgeKey, //to work properly we need to use a placeholder (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html#ExpressionAttributeNames)
      },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();
};

const toUrlString = buffer => {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
};

const validateParams = requestBody => {
  return (
    'userId' in requestBody &&
    'signatureCount' in requestBody &&
    /* not needed for slimmer form
    requestBody.wouldDonate !== undefined &&
    requestBody.wouldPrintAndSendSignatureLists !== undefined &&
    requestBody.wouldPutAndCollectSignatureLists !== undefined &&
    requestBody.wouldCollectSignaturesInPublicSpaces !== undefined &&
    */
    'newsletterConsent' in requestBody
  );
};

const getUser = userId => {
  return ddb
    .get({
      TableName: tableName,
      Key: {
        cognitoId: userId,
      },
    })
    .promise();
};

const errorResponse = (statusCode, message, error) => {
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
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
    isBase64Encoded: false,
  };
};
