#!/usr/bin/env node

const inquirer = require('inquirer');
const shell = require('shelljs');
const Configstore = require('configstore');
const packageJson = require('./package.json');

const config = new Configstore(packageJson.name);

const run = async () => {
  try {
    // Check if we have already saved credentials
    let awsConfig = config.get('aws');

    // If not we ask to user the enter credentials
    // and save them in the configstore for next time
    if (!awsConfig) {
      awsConfig = await askCredentials();
      config.set('aws', awsConfig);
    }

    // Copy mjml templates into mails folder
    shell.exec(
      'cp ../../../mails/donationMail.mjml mails/transactional/donationMail.mjml'
    );

    // Transform mjml template into html
    shell.exec(
      'mjml mails/transactional/donationMail.mjml -o mails/transactional/donationMail.html'
    );

    // shell.exec(
    //   `sls config credentials --provider aws --key ${awsConfig.key} --secret ${awsConfig.secret} --overwrite`
    // );

    // shell.exec('sls deploy -s cli -f updateUser');
  } catch (error) {
    console.log('Ooops, something went wrong', error);
  }
};

const askCredentials = () => {
  return inquirer.prompt([
    {
      name: 'key',
      type: 'input',
      message: 'Enter your AWS access key:',
      validate: value => {
        if (value.length > 0) {
          return true;
        }

        return 'Please enter your AWS access key.';
      },
    },
    {
      name: 'secret',
      type: 'password',
      message: 'Enter your AWS secret:',
      validate: value => {
        if (value.length > 0) {
          return true;
        }

        return 'Please enter your AWS secret.';
      },
    },
  ]);
};

run();
