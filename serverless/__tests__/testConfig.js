const SECRET_CONFIG = require('./secretConfig');

module.exports = {
  INVOKE_URL: 'https://2j0bcp5tr9.execute-api.eu-central-1.amazonaws.com/dev',
  INVOKE_URL_WITHOUT_HTTPS:
    '2j0bcp5tr9.execute-api.eu-central-1.amazonaws.com/dev',
  USER_POOL_ID: 'eu-central-1_SYtDaO0qH',
  ADMIN_POOL_ID: 'eu-central-1_R7ucfhvJM',
  DEV_USERS_TABLE: 'dev-users',
  DEV_MUNICIPALITIES_TABLE: 'dev-municipalities',
  DEV_USER_MUNICIPALITY_TABLE: 'dev-users-municipalities',
  CLIENT_ID: SECRET_CONFIG.CLIENT_ID,
  ADMIN_CLIENT_ID: SECRET_CONFIG.ADMIN_CLIENT_ID,
  USER_ID: '53b95dd2-74b8-49f4-abeb-add9c950c7d9',
  ADMIN_USER_ID: 'c6ce1b50-9d56-4a94-a4c7-e9f72e022235',
  PASSWORD: SECRET_CONFIG.PASSWORD,
  BASIC_AUTH_USERNAME: SECRET_CONFIG.BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD: SECRET_CONFIG.BASIC_AUTH_PASSWORD,
  QUERY_TOKEN: SECRET_CONFIG.QUERY_TOKEN,
};
