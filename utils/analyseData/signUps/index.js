const { getAllUsers } = require('../../shared/users/getUsers');
const CONFIG = require('../../config');

const getNewUserCountFromDate = async date => {
  const users = await getAllUsers(
    CONFIG.PROD_USERS_TABLE_NAME,
    'begins_with(createdAt, :conditionValue)',
    date
  );

  console.log(date, users.length);
};

const getMunicipalitySignupsFromDate = async date => {
  const signups = await getAllUsers(
    CONFIG.PROD_USER_MUNICIPALITY_TABLE_NAME,
    'begins_with(createdAt, :conditionValue)',
    date
  );

  console.log(date, signups.length);
};

getNewUserCountFromDate('2021-02-23');
getNewUserCountFromDate('2021-02-24');
getNewUserCountFromDate('2021-02-25');
getNewUserCountFromDate('2021-02-26');
getNewUserCountFromDate('2021-02-27');
getNewUserCountFromDate('2021-02-28');
getNewUserCountFromDate('2021-03-01');
getNewUserCountFromDate('2021-03-02');
getNewUserCountFromDate('2021-03-03');
