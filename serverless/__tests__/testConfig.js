const SECRET_CONFIG = require('./secretConfig');

module.exports = {
  INVOKE_URL: 'https://2j0bcp5tr9.execute-api.eu-central-1.amazonaws.com/dev',
  INVOKE_URL_WITHOUT_HTTPS:
    '2j0bcp5tr9.execute-api.eu-central-1.amazonaws.com/dev',
  USER_POOL_ID: 'eu-central-1_SYtDaO0qH',
  ADMIN_POOL_ID: 'eu-central-1_R7ucfhvJM',
  DEV_USERS_TABLE: 'dev-users',
  CLIENT_ID: SECRET_CONFIG.CLIENT_ID,
  ADMIN_CLIENT_ID: SECRET_CONFIG.ADMIN_CLIENT_ID,
  REFRESH_TOKEN: SECRET_CONFIG.REFRESH_TOKEN,
  ADMIN_REFRESH_TOKEN: SECRET_CONFIG.ADMIN_REFRESH_TOKEN,
};
