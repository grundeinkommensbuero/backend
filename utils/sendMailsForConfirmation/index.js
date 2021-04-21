const { API_KEY, API_SECRET, PROD_USERS_TABLE_NAME } = require('../config');
const { getAllUnconfirmedUsers } = require('../shared/users/getUsers');
const fs = require('fs');

const mailjet = require('node-mailjet').connect(API_KEY, API_SECRET);

const run = async () => {
  console.log('Getting users');
  const users = await getAllUnconfirmedUsers(PROD_USERS_TABLE_NAME);
  const usersWhoGotMail = [];
  console.log(users.length);

  for (const user of users) {
    if (new Date(user.createdAt) > new Date('2021-02-20')) {
      // Get token of user
      if ('customToken' in user) {
        const token = user.customToken.token;

        await sendMail(user.email, user.username, user.cognitoId, token);
        usersWhoGotMail.push(user.cognitoId);
      } else {
        console.log('No token for some reason', user.cognitoId);
      }
    }
  }

  fs.writeFileSync('./usersWhoGotMail.json', JSON.stringify(usersWhoGotMail));
};

const sendMail = (email, username, userId, token) => {
  const params = {
    Messages: [
      {
        To: [
          {
            Email: email,
          },
        ],
        TemplateID: 2809435,
        TemplateLanguage: true,
        TemplateErrorReporting: {
          Email: 'valentin@expedition-grundeinkommen.de',
          Name: 'Vali',
        },
        // TemplateErrorDeliver: true,
        Variables: {
          username,
          userId,
          token,
        },
      },
    ],
  };

  return mailjet.post('send', { version: 'v3.1' }).request(params);
};

run();
