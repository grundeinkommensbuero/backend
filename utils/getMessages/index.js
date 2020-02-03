const AWS = require('aws-sdk');
const fs = require('fs');
const CONFIG = require('../config');
const { getAllUsers } = require('../shared/users/getUsers');

const tableName = CONFIG.PROD_TABLE_NAME;

const exportMessagesAsCsv = async () => {
  try {
    const users = await getUsersWithMessages();
    generateCsv(users);
  } catch (error) {
    console.log('error', error);
  }
};

// Get all users, who have sent messages in general pledge
const getUsersWithMessages = async () => {
  console.log('getting users with messages');

  const usersWithMessages = [];
  const users = await getAllUsers(tableName);

  for (let user of users) {
    if ('pledges' in user) {
      for (let pledge of user.pledges) {
        if ('message' in pledge && pledge.message !== '') {
          usersWithMessages.push({
            email: user.email,
            username: user.username,
            message: pledge.message,
          });
        }
      }
    }
  }

  return usersWithMessages;
};

const generateCsv = users => {
  console.log('generating csv');

  let dataString = 'Email; Name; Nachricht\n';

  for (let user of users) {
    dataString += `${user.email};${user.username};"${user.message}"\n`;
  }

  fs.writeFileSync(`messages.csv`, dataString);
};

exportMessagesAsCsv();
