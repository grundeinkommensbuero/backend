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
      if (pledge.campaign.code === campaignCode) {
        return true;
      }
    }

    return false;
  });

  console.log('users from state', usersFromState.length);

  let conversionSum = 0;
  let conversionWithoutPowerUsersWhoPledgedLess = 0;
  let usersWithoutReceivedSignaturesCount = 0;
  let powerUsersWhoPledgedLess = 0;
  let powerUsersWhoPledgedMore = 0;

  let receivedSignatureSum = 0;

  let pledgesWithoutNumber = 0;

  for (const user of usersFromState) {
    let pledgedSignatureCount = 0;
    for (const pledge of user.pledges) {
      if (pledge.campaign.code === campaignCode) {
        if (pledge.signatureCount) {
          pledgedSignatureCount += pledge.signatureCount;
        } else {
          pledgesWithoutNumber++;
        }
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
          receivedSignatureCount += parseInt(scan.count, 10);
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

    if (isNaN(conversion)) {
      console.log(
        'is nan',
        pledgedSignatureCount,
        receivedSignatureCount,
        conversion
      );
    }

    if (
      receivedSignatureCount > 30 &&
      pledgedSignatureCount >= receivedSignatureCount
    ) {
      powerUsersWhoPledgedMore++;
      conversionWithoutPowerUsersWhoPledgedLess += conversion;

      console.log(
        'Power user',
        { pledgedSignatureCount },
        { receivedSignatureCount }
      );
    } else if (
      receivedSignatureCount > 30 &&
      pledgedSignatureCount < receivedSignatureCount
    ) {
      powerUsersWhoPledgedLess++;

      console.log(
        'Power user',
        { pledgedSignatureCount },
        { receivedSignatureCount }
      );
    } else {
      conversionWithoutPowerUsersWhoPledgedLess += conversion;
    }

    process.stdout.write(`conversion for user: ${conversion} \r`);

    conversionSum += conversion;
  }

  console.log('Users count', usersFromState.length);
  console.log('Pledges without number', pledgesWithoutNumber);
  console.log('Conversion sum', conversionSum);

  console.log(
    'Users without received signatures: ',
    usersWithoutReceivedSignaturesCount
  );

  console.log('Power users who pledged more: ', powerUsersWhoPledgedMore);

  console.log('Power users who pledged less: ', powerUsersWhoPledgedLess);
  console.log(
    'conversionWithoutPowerUsersWhoPledgedLess: ',
    conversionWithoutPowerUsersWhoPledgedLess
  );

  console.log('receivedSignatureSum: ', receivedSignatureSum);
  console.log(
    'Average received signatures',
    receivedSignatureSum / usersFromState.length
  );

  console.log(
    'Average conversion without 0 conversion: ',
    conversionSum /
      (usersFromState.length - usersWithoutReceivedSignaturesCount)
  );

  console.log(
    'Average conversion without 0 conversion and power users who pledged less: ',
    conversionWithoutPowerUsersWhoPledgedLess /
      (usersFromState.length -
        usersWithoutReceivedSignaturesCount -
        powerUsersWhoPledgedLess)
  );

  console.log(
    'Average conversion without power users who pledged less: ',
    conversionWithoutPowerUsersWhoPledgedLess /
      (usersFromState.length - powerUsersWhoPledgedLess)
  );

  console.log('Average conversion: ', conversionSum / usersFromState.length);
};

const getAnonymousSignatureCount = async (
  signaturesTableName,
  campaignCode
) => {
  const result = await getSignatureListsOfUser(
    signaturesTableName,
    'anonymous',
    campaignCode
  );

  let receivedSignatureCount = 0;

  for (const signatureList of result.Items) {
    if ('received' in signatureList) {
      for (const scan of signatureList.received) {
        receivedSignatureCount += scan.count;
      }
    }
  }

  console.log('Anonymous signature count', receivedSignatureCount);
};

getPledgeConversion(
  PROD_USERS_TABLE_NAME,
  PROD_SIGNATURES_TABLE_NAME,
  'berlin-1'
);

// getAnonymousSignatureCount(PROD_SIGNATURES_TABLE_NAME, 'hamburg-1');
