const SECRET_CONFIG = require('./secretConfig');

module.exports = {
  INVOKE_URL: 'https://51kjphvbxi.execute-api.eu-central-1.amazonaws.com/dev',
  INVOKE_URL_WITHOUT_HTTPS:
    '51kjphvbxi.execute-api.eu-central-1.amazonaws.com/dev',
  USER_POOL_ID: 'eu-central-1_uLU400Ns2',
  ADMIN_POOL_ID: 'eu-central-1_W3Fnamqjg',
  DEV_USERS_TABLE: 'dev-users',
  DEV_MUNICIPALITIES_TABLE: 'dev-municipalities',
  DEV_USER_MUNICIPALITY_TABLE: 'dev-users-municipalities',
  DEV_VOUCHERS_TABLE: 'dev-vouchers',
  CLIENT_ID: SECRET_CONFIG.CLIENT_ID,
  ADMIN_CLIENT_ID: SECRET_CONFIG.ADMIN_CLIENT_ID,
  USER_ID: '92c1e189-52d0-45cc-adbe-8071696a3221',
  ADMIN_USER_ID: '53049892-b021-70eb-f7d8-2ddafa7d911b',
  PASSWORD: SECRET_CONFIG.PASSWORD,
  BASIC_AUTH_USERNAME: SECRET_CONFIG.BASIC_AUTH_USERNAME,
  BASIC_AUTH_PASSWORD: SECRET_CONFIG.BASIC_AUTH_PASSWORD,
  QUERY_TOKEN: SECRET_CONFIG.QUERY_TOKEN,
};
