// We need to set the env variable beforehand
process.env = Object.assign(process.env, { USERS_TABLE_NAME: 'dev-users' });
const { getAllUnconfirmedUsers } = require('../../../src/shared/users');

describe('users database access and util functions test', () => {
  beforeAll(() => {});

  it('should get all unconfirmed users', async () => {
    const currentTime = new Date().getTime();
    const users = await getAllUnconfirmedUsers();
    console.log('took', new Date().getTime() - currentTime);

    expect(Array.isArray(users)).toEqual(true);
    expect(!('confirmed' in users[0]) || !users[0].confirmed.value).toEqual(
      true
    );
  });
});
