const { getUsersWithPledge } = require('../../shared/users/getUsers');
const { getSignatureListsOfUser } = require('../../shared/signatures');

const {
  PROD_SIGNATURES_TABLE_NAME,
  PROD_USERS_TABLE_NAME,
} = require('../../config');

const getPledgeConversion = async (
  usersTableName,
  signaturesTableName,
  campaignCode
) => {
  const users = await getUsersWithPledge(usersTableName);

  // only users with pledges from hamburg
  const usersFromState = users.filter(user => {
    for (const pledge of user.pledges) {
      return pledge.campaign.code === campaignCode;
    }

    return false;
  });

  let conversionSum = 0;
  let usersWithoutReceivedSignaturesCount = 0;
  let receivedSignatureSum = 0;

  for (const user of usersFromState) {
    let pledgedSignatureCount = 0;
    for (const pledge of user.pledges) {
      if (pledge.campaign.code === campaignCode) {
        pledgedSignatureCount += pledge.signatureCount;
      }
    }

    const signatureListsResult = await getSignatureListsOfUser(
      signaturesTableName,
      user.cognitoId,
      campaignCode
    );

    let receivedSignatureCount = 0;

    for (const signatureList of signatureListsResult.Items) {
      if ('received' in signatureList) {
        for (const scan of signatureList.received) {
          receivedSignatureCount += scan.count;
        }
      }
    }

    receivedSignatureSum += receivedSignatureCount;

    const conversion =
      pledgedSignatureCount === 0
        ? receivedSignatureCount
        : receivedSignatureCount / pledgedSignatureCount;

    if (conversion === 0) {
      usersWithoutReceivedSignaturesCount++;
    }
    process.stdout.write(`conversion for user: ${conversion} \r`);

    conversionSum += conversion;
  }

  console.log('Users count', usersFromState.length);

  console.log(
    'Users without received signatures: ',
    usersWithoutReceivedSignaturesCount
  );

  console.log(
    'Average received signatures',
    receivedSignatureSum / usersFromState.length
  );

  console.log('Average conversion: ', conversionSum / usersFromState.length);
};

getPledgeConversion(
  PROD_USERS_TABLE_NAME,
  PROD_SIGNATURES_TABLE_NAME,
  'hamburg-1'
);
