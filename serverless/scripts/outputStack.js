const shell = require('shelljs');

module.exports.handler = data => {
  const json = {
    userPoolId: data.UserPoolId,
    adminUserPoolId: data.AdminUserPoolId,
    userPoolClientId: data.UserPoolClientId,
    adminUserPoolClientId: data.AdminUserPoolClientId,
    endpointUrl: data.ServiceEndpoint,
    region: data.Region,
  };

  // Write stack json to to file
  new shell.ShellString(JSON.stringify(json)).to(
    `${process.env.INIT_CWD}/stack.json`
  );
};
