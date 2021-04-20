const SECRET_CONFIG = require('./secretConfig');

module.exports = {
  PROD_USERS_TABLE_NAME: 'prod-users',
  PROD_SIGNATURES_TABLE_NAME: 'prod-signatures',
  PROD_USER_POOL_ID: 'eu-central-1_xx4VmPPdF',
  DEV_USERS_TABLE_NAME: 'dev-users',
  DEV_SIGNATURES_TABLE_NAME: 'dev-signatures',
  DEV_MUNICIPALITIES_TABLE_NAME: 'dev-municipalities',
  DEV_USER_MUNICIPALITY_TABLE_NAME: 'dev-users-municipalities',
  PROD_MUNICIPALITIES_TABLE_NAME: 'prod-municipalities',
  PROD_USER_MUNICIPALITY_TABLE_NAME: 'prod-users-municipalities',
  DEV_USER_POOL_ID: 'eu-central-1_SYtDaO0qH',
  API_KEY: SECRET_CONFIG.API_KEY,
  API_SECRET: SECRET_CONFIG.API_SECRET,
};
