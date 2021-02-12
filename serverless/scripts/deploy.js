#!/usr/bin/env node

const inquirer = require('inquirer');
const shell = require('shelljs');
const config = require('../config.json');

const configPath = `${process.cwd()}/config.json`;

const run = async () => {
  try {
    const { projectName } = config;

    if (!projectName) {
      throw new Error('No project name defined');
    }

    let awsConfig = config.aws;

    // Check if we have already saved credentials
    // If not we ask to user the enter credentials
    // and save them in the configstore for next time
    if (!awsConfig) {
      awsConfig = await askCredentials();
    }

    let email = config.email;
    // Check if we have already save email
    if (!email) {
      const answer = await askEmail();
      email = answer.email;
    }

    // Save config to file
    new shell.ShellString(
      JSON.stringify({ aws: awsConfig, email, projectName })
    ).to(configPath);

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

    // Copy signature lists into createSignatureList folder
    shell.cp('-r', `${process.cwd()}/lists/*.pdf`, `${__dirname}/../pdfs/`);

    shell.cd(`${__dirname}/../`);

    shell.exec(
      `sls config credentials --provider aws --key ${awsConfig.key} --secret ${awsConfig.secret} --overwrite`
    );

    shell.exec(`sls deploy -s dd --projectName ${projectName}`);
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
