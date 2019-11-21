const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = 'Users';

const analyseData = async () => {
  try {
    const users = await getAllUsers();
    const notVerifiedCognitoUsers = await getAllNotVerifiedCognitoUsers();
    console.log('not verified count', notVerifiedCognitoUsers.length);
    //go through users to sum up pledged signatures
    const campaignStats = {};
    for (let user of users.Items) {
      //check if the user is verified
      let verified = isVerified(user, notVerifiedCognitoUsers);

      //if user is not verified we do not need to count the signatures
      if ('pledges' in user) {
        //go through pledges of this users
        for (let pledge of user.pledges) {
          //initialize object for this pledge;
          if (!(pledge.campaign.code in campaignStats)) {
            campaignStats[pledge.campaign.code] = {
              verifiedUsers: 0,
              unverifiedUsers: 0,
              signatures: 0,
              newsletterConsents: 0,
            };
          }

          if (verified) {
            campaignStats[pledge.campaign.code].verifiedUsers++;
          } else {
            campaignStats[pledge.campaign.code].unverifiedUsers++;
          }

          if ('newsletterConsent' in user && user.newsletterConsent.value) {
            campaignStats[pledge.campaign.code].newsletterConsents++;
          }

          if ('signatureCount' in pledge) {
            const signatureCount = parseInt(pledge.signatureCount);
            if (!isNaN(signatureCount)) {
              campaignStats[pledge.campaign.code].signatures += signatureCount;
            }
          }
        }
      }
    }

    console.log('Campaign stats', campaignStats);
    return campaignStats;
  } catch (error) {
    console.log('error while fetching users from db', error);
  }
};

const getAllUsers = () => {
  const params = {
    TableName: tableName,
  };
  return ddb.scan(params).promise();
};

const getAllNotVerifiedCognitoUsers = async () => {
  let notVerifiedCognitoUsers = [];
  let data = await getNotVerifiedCognitoUsers(null);
  //add elements of user array
  notVerifiedCognitoUsers.push(...data.Users);
  while (data.PaginationToken) {
    data = await getNotVerifiedCognitoUsers(data.PaginationToken);
    //add elements of user array
    notVerifiedCognitoUsers.push(...data.Users);
  }
  return notVerifiedCognitoUsers;
};

//This functions only fetches the maximum of 60 users
const getNotVerifiedCognitoUsers = paginationToken => {
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

const isVerified = (user, notVerifiedCognitoUsers) => {
  let verified = true;
  for (let cognitoUser of notVerifiedCognitoUsers) {
    //sub is the only attribute
    if (user.cognitoId === cognitoUser.Attributes[0].Value) {
      verified = false;
    }
  }
  return verified;
};

analyseData();
