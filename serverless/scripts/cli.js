#!/usr/bin/env node

const inquirer = require('inquirer');
const shell = require('shelljs');
const Configstore = require('configstore');
const packageJson = require('../package.json');

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
    shell.cp(
      '../../../mails/donationMail.mjml',
      'mails/transactional/donationMail.mjml'
    );
    shell.cp(
      '../../../mails/congratulationMail.mjml',
      'mails/transactional/congratulationMail.mjml'
    );
    shell.cp(
      '../../../mails/loginCodeMail.mjml',
      'mails/transactional/loginCodeMail.mjml'
    );
    shell.cp(
      '../../../mails/signatureListMail.mjml',
      'mails/transactional/signatureListMail.mjml'
    );

    // Transform mjml templates into html
    shell.exec(
      'mjml mails/transactional/donationMail.mjml -o mails/transactional/donationMail.html'
    );
    shell.exec(
      'mjml mails/transactional/congratulationMail.mjml -o mails/transactional/congratulationMail.html'
    );
    shell.exec(
      'mjml mails/transactional/loginCodeMail.mjml -o mails/transactional/loginCodeMail.html'
    );
    shell.exec(
      'mjml mails/transactional/signatureListMail.mjml -o mails/transactional/signatureListMail.html'
    );

    // Copy signature list into createSignatureList folder
    shell.cp('../../../list/signature_list.pdf', 'pdfs/direct-democracy');

    shell.exec(
      `sls config credentials --provider aws --key ${awsConfig.key} --secret ${awsConfig.secret} --overwrite`
    );

    shell.exec('sls deploy -s cli');
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
