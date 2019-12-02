const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const pinpoint = new AWS.Pinpoint(config);
const projectId = '83c543b1094c4a91bf31731cd3f2f005';
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = 'Users';
const zipCodeMatcher = require('../zipCodeMatcher');

const fillPinpoint = async () => {
  try {
    const users = await getAllUsers();
    const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();
    let count = 0;
    for (let user of users) {
      const {
        cognitoId: userId, //rename cognitoId to userId while destructuring
        createdAt,
        email,
        zipCode,
        username,
        referral,
      } = user;
      let { newsletterConsent } = user;
      //for now we just take the first pledge
      let pledge;
      if ('pledges' in user) {
        pledge = user.pledges[0];
      }

      const pledgeAttributes = [];
      if (typeof pledge !== 'undefined' && pledge !== null) {
        if (pledge.wouldPrintAndSendSignatureLists) {
          pledgeAttributes.push('wouldPrintAndSendSignatureLists');
        }
        if (pledge.wouldCollectSignaturesInPublicSpaces) {
          pledgeAttributes.push('wouldCollectSignaturesInPublicSpaces');
        }
        if (pledge.wouldPutAndCollectSignatureLists) {
          pledgeAttributes.push('wouldPutAndCollectSignatureLists');
        }
        if (pledge.wouldDonate) {
          pledgeAttributes.push('wouldDonate');
        }
        if (
          'wouldEngageCustom' in pledge &&
          pledge.wouldEngageCustom !== 'empty' &&
          pledge.wouldEngageCustom.length < 50
        ) {
          pledgeAttributes.push(pledge.wouldEngageCustom);
        }
      }

      // Make use of utility function to match the state to a given zip code
      let region = 'undefined';
      if (typeof zipCode !== 'undefined') {
        region = zipCodeMatcher.getStateByZipCode(zipCode);
      }
      console.log('matched region', region);

      //check if the user is verified
      let verified = isVerified(user, unverifiedCognitoUsers);
      //workaround, while some newsletter consents may already have the new format {value, timestamp}
      //old format is just boolean
      if (typeof newsletterConsent !== 'undefined') {
        //if user is not yet verified opt out in pinpoint
        if (verified) {
          newsletterConsent =
            typeof newsletterConsent === 'boolean'
              ? newsletterConsent
              : newsletterConsent.value;
        } else {
          newsletterConsent = false;
        }
      } else {
        newsletterConsent = false;
      }

      //construct username with space before
      let pinpointName;
      if (typeof username !== 'undefined' && username !== 'empty') {
        pinpointName = `\u00A0${username}`;
      } else {
        pinpointName = '';
      }

      //some signatureCounts were saved as string (need to refactor in db),
      //which is why we need to parse them
      let signatureCount =
        typeof pledge !== 'undefined' ? parseInt(pledge.signatureCount) : 0;
      signatureCount = isNaN(signatureCount) ? 0 : signatureCount;

      const params = {
        ApplicationId: projectId,
        EndpointId: `email-endpoint-${userId}`,
        EndpointRequest: {
          ChannelType: 'EMAIL',
          Address: email,
          Attributes: {
            Referral: [referral],
            Region: [region],
            Pledge: pledgeAttributes,
            PostalCode: [zipCode],
          },
          EffectiveDate: createdAt,
          Location: {
            PostalCode: zipCode,
            Region: region,
          },
          Metrics: {
            SignatureCount: signatureCount,
          },
          OptOut: newsletterConsent ? 'NONE' : 'ALL',
          User: {
            UserId: userId,
            UserAttributes: {
              Username: [pinpointName],
            },
          },
        },
      };
      console.log('trying to update the endpoint with params:', params);
      try {
        const result = await pinpoint.updateEndpoint(params).promise();
        console.log('updated pinpoint', result);
        count++;
      } catch (error) {
        console.log(error);
        break;
      }
    }
    console.log('updated count', count);
  } catch (error) {
    console.log('error', error);
  }
};

//functions which gets all users and uses the lastEvaluatedKey
//to make multiple requests
const getAllUsers = async () => {
  const users = [];
  let result = await getUsers();
  //add elements to existing array
  users.push(...result.Items);
  while ('LastEvaluatedKey' in result) {
    console.log('another request to db', result.LastEvaluatedKey);
    result = await getUsers(result.LastEvaluatedKey);
    users.push(...result.Items);
  }
  return users;
};

const getUsers = (startKey = null) => {
  const params = {
    TableName: tableName,
  };
  if (startKey !== null) {
    params.ExclusiveStartKey = startKey;
  }
  return ddb.scan(params).promise();
};

const getAllUnverifiedCognitoUsers = async () => {
  let unverifiedCognitoUsers = [];
  let data = await getUnverifiedCognitoUsers(null);
  //add elements of user array
  unverifiedCognitoUsers.push(...data.Users);
  while ('PaginationToken' in data) {
    data = await getUnverifiedCognitoUsers(data.PaginationToken);
    //add elements of user array
    unverifiedCognitoUsers.push(...data.Users);
  }
  return unverifiedCognitoUsers;
};

//This functions only fetches the maximum of 60 users
const getUnverifiedCognitoUsers = paginationToken => {
  const params = {
    UserPoolId: 'eu-central-1_74vNy5Iw0',
    Filter: 'cognito:user_status = "UNCONFIRMED"',
    AttributesToGet: [
      'sub', //sub is the id
    ],
    PaginationToken: paginationToken,
  };
  //get all users, which are not verified from user pool
  return cognito.listUsers(params).promise();
};

const isVerified = (user, unverifiedCognitoUsers) => {
  let verified = true;
  for (let cognitoUser of unverifiedCognitoUsers) {
    //sub is the only attribute
    if (user.cognitoId === cognitoUser.Attributes[0].Value) {
      verified = false;
    }
  }
  return verified;
};

fillPinpoint();
