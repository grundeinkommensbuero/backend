const { authenticate } = require('./');

// Change userId depending on the user you want to authenticate
const userId = '92c1e189-52d0-45cc-adbe-8071696a3221';

authenticate(userId).then(token => console.log(token));
