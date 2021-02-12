/**
 * This script is used as a post install script to copy the mjml templates and the signature list
 * template to the folder,
 * in which the npm package is installed, for the first time.
 */

//  To not bring in another syntax I only use shell js. I could also
// use fs to do all of the following, but we use only shell in the cli.js script anyway.
const shell = require('shelljs');
const fs = require('fs');

const copyTemplates = () => {
  // Create folders and copy mjml templates and includes into mails folder,
  // but only if the files don't already exist
  if (!shell.test('-e', `${process.env.INIT_CWD}/mails`)) {
    shell.mkdir('-p', `${process.env.INIT_CWD}/mails/includes`);

    // We need the dot, because we don't want to copy the folder itself, only the files within
    shell.cp(
      '-r',
      'mails/transactional/*.mjml',
      `${process.env.INIT_CWD}/mails`
    );
    shell.cp(
      '-r',
      'mails/includes/.',
      `${process.env.INIT_CWD}/mails/includes`
    );
  } else {
    console.log('Mails were already copied, skipping this step...');
  }

  // Same procedure for the signature list template

  // But first we need to get campaign config to create folder names
  const { campaigns } = JSON.parse(
    fs.readFileSync(`${process.env.INIT_CWD}/campaigns.json`, 'utf8')
  );

  if (!shell.test('-e', `${process.env.INIT_CWD}/list`)) {
    shell.mkdir(`${process.env.INIT_CWD}/list`);

    for (const campaign of campaigns) {
      shell.cp(
        'pdfs/direct-democracy/signature_list.pdf',
        `${process.env.INIT_CWD}/lists/${campaign.name}-${campaign.round}`
      );
    }
  }

  // Depending on the campaigns we also alter some js files
  fs.writeFileSync(
    `${__dirname}/../../src/shared/signatures/createPdf/attachments.js`,
    generateAttachmentFile(campaigns)
  );

  fs.writeFileSync(
    `${__dirname}/../../src/shared/signatures/createPdf/inputPdfs.js`,
    generateInputPdfsFile(campaigns)
  );
};

const generateInputPdfsFile = campaigns => {
  let fileContent = `
  const fs = require('fs');

  DD: {
    BARCODE: {
      x: 435,
      y: 35,
      width: 120,
      height: 55,
    },
    QRCODE: {
      x: 360.5,
      y: 46,
      width: 37,
      height: 37,
    },
  },
  `;

  for (const campaign of campaigns) {
    fileContent += `
    '${campaign.name}-${campaign.round}': {
      COMBINED: {
        file: fs.readFileSync(
          __dirname + '/pdfs/${campaign.name}-${campaign.round}/signature_list.pdf'
        ),
        codes: [
          {
            type: 'BAR',
            page: 0,
            position: CODE_POSITIONS.DD.BARCODE,
          },
          {
            type: 'QR',
            page: 0,
            position: CODE_POSITIONS.DD.QRCODE,
          },
        ],
      },
    },
    `;
  }

  fileContent += '}';

  return fileContent;
};
const generateAttachmentFile = campaigns => {
  let fileContent = `
  const fs = require('fs');

  module.exports = {
  `;

  for (const campaign of campaigns) {
    fileContent += `
      '${campaign.name}-${campaign.round}': [
        {
          filename: 'Listen.pdf',
          type: 'COMBINED',
        },
      ],
      `;
  }

  fileContent += '}';

  return fileContent;
};

copyTemplates();
