const { authenticate } = require('./');

// Change userId depending on the user you want to authenticate
const userId = '53b95dd2-74b8-49f4-abeb-add9c950c7d9';

authenticate(userId).then(token => console.log(token));
