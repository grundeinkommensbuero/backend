const { getAllUsers } = require('../../shared/users/getUsers');
const CONFIG = require('../../config');

const getNewUserCountSinceDate = async date => {
  const users = await getAllUsers(CONFIG.PROD_USERS_TABLE_NAME);

  console.log('user count', users.length);

  date = new Date(date);

  const newUsers = users.filter(user => new Date(user.createdAt) > date);

  console.log(`user count since ${date}`, newUsers.length);
};

getNewUserCountSinceDate('2020-03-19');
