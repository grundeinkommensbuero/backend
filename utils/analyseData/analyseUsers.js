const AWS = require('aws-sdk');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = 'prod-users';
const tableNameBackup = 'UsersWithoutConsent-14-11';
const userPoolId = 'eu-central-1_xx4VmPPdF';

module.exports.analyseUsers = async () => {
  try {
    let users = await getAllUsers();
    //loop through backup users and add all the users who are not already in users
    users = await migrateUsersFromBackup(users);
    const unverifiedCognitoUsers = await getAllUnverifiedCognitoUsers();
    console.log('not verified count', unverifiedCognitoUsers.length);
    //go through users to sum up pledged signatures
    const campaignStats = {};
    for (let user of users) {
      //check if the user is verified
      let verified = isVerified(user, unverifiedCognitoUsers);

      //if user is not verified we do not need to count the signatures
      if ('pledges' in user) {
        //go through pledges of this users
        for (let pledge of user.pledges) {
          const campaign = pledge.campaign.code;

          //initialize object for this pledge;
          if (!(campaign in campaignStats)) {
            campaignStats[campaign] = {
              verifiedUsers: { count: 0, signatures: 0 },
              unverifiedUsers: { count: 0 },
              usersWithNewsletterConsent: { count: 0, signatures: 0 },
              powerUsers: [],
            };
          }

          //the users, wo were migrated are not in cognito
          if (verified || user.fromBackup) {
            campaignStats[campaign].verifiedUsers.count++;
            let newsletterConsent = false;
            //count the newsletter consents for all verified users
            if ('newsletterConsent' in user && user.newsletterConsent.value) {
              campaignStats[campaign].usersWithNewsletterConsent.count++;
              newsletterConsent = true;
            }
            //count the pledged signatures for all verified users
            if ('signatureCount' in pledge) {
              const signatureCount = parseInt(pledge.signatureCount);
              if (!isNaN(signatureCount)) {
                //if the newsletter consent was given, also add it up for those users
                if (newsletterConsent) {
                  campaignStats[
                    campaign
                  ].usersWithNewsletterConsent.signatures += signatureCount;
                }
                //otherwise only add it for the (only) verified users
                campaignStats[
                  campaign
                ].verifiedUsers.signatures += signatureCount;

                //generate a list of power users
                //(20+ pledged signatures or wants to collect in public spaces)
                if (
                  signatureCount >= 20 ||
                  pledge.wouldCollectSignaturesInPublicSpaces
                ) {
                  // campaignStats[campaign].powerUsers.push(user);
                }
              }
            }
          } else {
            campaignStats[campaign].unverifiedUsers.count++;
          }
        }
      }
    }

    return campaignStats;
  } catch (error) {
    console.log('error while fetching users from db', error);
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

const getAllUsersFromBackup = () => {
  const params = {
    TableName: tableNameBackup,
  };
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
    UserPoolId: userPoolId,
    Filter: 'cognito:user_status = "UNCONFIRMED"',
    AttributesToGet: [
      'sub', //sub is the id
    ],
    PaginationToken: paginationToken,
  };
  //get all users, which are not verified from user pool
  return cognito.listUsers(params).promise();
};

const migrateUsersFromBackup = async users => {
  let added = 0;
  const backupUsers = await getAllUsersFromBackup();
  console.log('Backup users count', backupUsers.Count);
  for (let backupUser of backupUsers.Items) {
    //check if the user is already in users
    if (users.findIndex(user => user.email === backupUser.email) === -1) {
      //backup user is not already in there
      backupUser.fromBackup = true;
      users.push(backupUser);
      added++;
    }
  }
  console.log(`Added ${added} users from backup`);
  return users;
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
