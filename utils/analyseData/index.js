const AWS = require('aws-sdk');
const fs = require('fs');
const config = { region: 'eu-central-1' };
const ddb = new AWS.DynamoDB.DocumentClient(config);
const cognito = new AWS.CognitoIdentityServiceProvider(config);
const tableName = 'Users';
const tableNameBackup = 'UsersWithoutConsent-14-11';

const runScript = async () => {
  const stats = await analyseData();
  generateCsv(stats, 'schleswig-holstein-1');
  generateCsv(stats, 'brandenburg-1');
};

//Parses the users array to a string and saves it as csv file
const generateCsv = (stats, campaign) => {
  let dataString =
    'Email, Name, Anzahl Unterschriften, Auf Strasse sammeln, PLZ\n';
  const powerUsers = stats[campaign].powerUsers;
  for (let user of powerUsers) {
    //for now we just expect a user to only have one pledge
    dataString += `${user.email},${user.username},${
      user.pledges[0].signatureCount
    },${user.pledges[0].wouldCollectSignaturesInPublicSpaces ? 'Ja' : 'Nein'},${
      user.zipCode
    }\n`;
  }
  fs.writeFileSync(`powerusers-${campaign}.csv`, dataString);
};

const analyseData = async () => {
  try {
    const result = await getAllUsers();
    //loop through backup users and add all the users who are not already in users
    const users = await migrateUsersFromBackup(result.Items);

    const notVerifiedCognitoUsers = await getAllNotVerifiedCognitoUsers();
    console.log('not verified count', notVerifiedCognitoUsers.length);
    //go through users to sum up pledged signatures
    const campaignStats = {};
    for (let user of users) {
      //check if the user is verified
      let verified = isVerified(user, notVerifiedCognitoUsers);

      //if user is not verified we do not need to count the signatures
      if ('pledges' in user) {
        //go through pledges of this users
        for (let pledge of user.pledges) {
          const campaign = pledge.campaign.code;

          //initialize object for this pledge;
          if (!(campaign in campaignStats)) {
            campaignStats[campaign] = {
              verifiedUsers: 0,
              unverifiedUsers: 0,
              signatures: 0,
              newsletterConsents: 0,
              powerUsers: [],
            };
          }

          if (verified) {
            campaignStats[campaign].verifiedUsers++;

            //count the newsletter consents for all verified users
            if ('newsletterConsent' in user && user.newsletterConsent.value) {
              campaignStats[campaign].newsletterConsents++;
            }
            //count the pledged signatures for all verified users
            if ('signatureCount' in pledge) {
              const signatureCount = parseInt(pledge.signatureCount);
              if (!isNaN(signatureCount)) {
                campaignStats[campaign].signatures += signatureCount;

                //generate a list of power users
                //(20+ pledged signatures or wants to collect in public spaces)
                if (
                  signatureCount >= 20 ||
                  pledge.wouldCollectSignaturesInPublicSpaces
                ) {
                  campaignStats[campaign].powerUsers.push(user);
                }
              }
            }
          } else {
            campaignStats[campaign].unverifiedUsers++;
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

const getAllUsersFromBackup = () => {
  const params = {
    TableName: tableNameBackup,
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

const migrateUsersFromBackup = async users => {
  let added = 0;
  const backupUsers = await getAllUsersFromBackup();
  console.log('Backup users count', backupUsers.Count);
  for (let backupUser of backupUsers.Items) {
    //check if the user is already in users
    if (users.findIndex(user => user.email === backupUser.email) === -1) {
      //backup user is not already in there
      users.push(backupUser);
      added++;
    }
  }
  console.log(`Added ${added} users from backup`);
  return users;
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

runScript();
