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

    // Check if we have already save email
    if (!config.get('email')) {
      const { email } = await askEmail();
      config.set('email', email);
    }

    // Copy mjml templates into mails folder
    shell.cp(
      `${process.cwd()}/mails/donationMail.mjml`,
      `${__dirname}/../mails/transactional/donationMail.mjml`
    );
    shell.cp(
      `${process.cwd()}/mails/congratulationMail.mjml`,
      `${__dirname}/../mails/transactional/congratulationMail.mjml`
    );
    shell.cp(
      `${process.cwd()}/mails/loginCodeMail.mjml`,
      `${__dirname}/../mails/transactional/loginCodeMail.mjml`
    );
    shell.cp(
      `${process.cwd()}/mails/signatureListMail.mjml`,
      `${__dirname}/../mails/transactional/signatureListMail.mjml`
    );
    shell.cp('-r', `${process.cwd()}/mails/includes`, `${__dirname}/../mails/`);

    // Transform mjml templates into html
    shell.exec(
      `mjml ${__dirname}/../mails/transactional/donationMail.mjml -o ${__dirname}/../mails/transactional/donationMail.html`
    );
    shell.exec(
      `mjml ${__dirname}/../mails/transactional/congratulationMail.mjml -o ${__dirname}/../mails/transactional/congratulationMail.html`
    );
    shell.exec(
      `mjml ${__dirname}/../mails/transactional/loginCodeMail.mjml -o ${__dirname}/../mails/transactional/loginCodeMail.html`
    );
    shell.exec(
      `mjml ${__dirname}/../mails/transactional/signatureListMail.mjml -o ${__dirname}/../mails/transactional/signatureListMail.html`
    );

    // Copy signature list into createSignatureList folder
    shell.cp(
      `${process.cwd()}/list/signature_list.pdf`,
      `${__dirname}/../pdfs/direct-democracy`
    );

    shell.cd(`${__dirname}/../`);

    shell.exec(
      `sls config credentials --provider aws --key ${awsConfig.key} --secret ${awsConfig.secret} --overwrite`
    );

    shell.exec('sls deploy -s dev');
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

const askEmail = () => {
  return inquirer.prompt([
    {
      name: 'email',
      type: 'input',
      message:
        'Enter the e-mail address from which automatic mails should be sent:',
      validate: value => {
        if (value.length > 0) {
          return true;
        }

        return 'Please enter an e-mail address.';
      },
    },
  ]);
};

run();
