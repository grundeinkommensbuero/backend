/**
 * This script is used as a post install script to copy the mjml templates and the signature list
 * template to the folder,
 * in which the npm package is installed, for the first time.
 */

//  To not bring in another syntax I only use shell js. I could also
// use fs to do all of the following, but we use only shell in the cli.js script anyway.
const shell = require('shelljs');

const copyTemplates = () => {
  // Create folders and copy mjml templates and includes into mails folder,
  // but only if the files don't already exist
  if (!shell.test('-e', '../../../mails')) {
    shell.mkdir('-p', '../../../mails/includes');

    // We need the dot, because we don't want to copy the folder itself, only the files within
    shell.cp('-r', 'mails/transactional/.', '../../../mails');
    shell.cp('-r', 'mails/includes/.', '../../../mails/includes');
  } else {
    console.log('Mails were already copied, skipping this step...');
  }

  // Same procedure for the signature list template
  if (!shell.test('-e', '../../../list')) {
    shell.mkdir('../../../list');

    shell.cp('pdfs/direct-democracy/signature_list.pdf', '../../../list');
  }
};

copyTemplates();