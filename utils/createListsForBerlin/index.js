const { createUser } = require('../migrateUsers');
const { getUserByMail } = require('../shared/users/getUsers');
const createListManually = require('../../serverless/src/shared/signatures/createPdf/createManually');
const { PROD_USERS_TABLE_NAME } = require('../config');

const createLists = async () => {
  try {
    for (let i = 1; i < 51; i++) {
      const user = { email: `berlin-2-liste${i}@expedition-grundeinkommen.de` };
      try {
        await createUser(user);
        console.log('created user', user.email);
      } catch (error) {
        if (error.code === 'UsernameExistsException') {
          console.log('user exists', user.email);
        } else {
          console.log('different error', error);
        }
      }

      // Get userId of user
      const result = await getUserByMail(PROD_USERS_TABLE_NAME, user.email);

      if (result.Count === 0) {
        throw new Error(`no user found with that email ${user.email}`);
      } else {
        const userId = result.Items[0].cognitoId;

        // Create signature list
        await createListManually(userId);
      }
    }
  } catch (error) {
    console.log('error while creating letter lists', error);
  }
};

createLists();
