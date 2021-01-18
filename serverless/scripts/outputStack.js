const shell = require('shelljs');

module.exports.handler = data => {
  const json = {
    userPoolId: data.UserPoolId,
    userPoolClientId: data.UserPoolClientId,
    endpointUrl: data.ServiceEndpoint,
  };

  // Write stack json to to file
  new shell.ShellString(JSON.stringify(json)).to(
    `${process.env.INIT_CWD}/stack.json`
  );
};
