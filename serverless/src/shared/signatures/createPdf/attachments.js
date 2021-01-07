const fs = require('fs');

module.exports = {
  'berlin-1': [
    {
      filename: 'Liste_schwarz-weiss.pdf',
      type: 'SINGLE_SW',
    },
    {
      filename: 'Liste_farbig.pdf',
      type: 'SINGLE',
    },
  ],
  'hamburg-1': [
    {
      filename: 'Tipps_zum_Unterschriftensammeln.pdf',
      file: fs.readFileSync(`${__dirname}/pdfs/hamburg-1/TIPPS.pdf`),
    },
    {
      filename: 'Liste_schwarz-weiss.pdf',
      type: 'SINGLE_SW',
    },
    {
      filename: 'Liste_Farbig.pdf',
      type: 'SINGLE',
    },
    {
      filename: 'Newsletter.pdf',
      file: fs.readFileSync(`${__dirname}/pdfs/hamburg-1/NEWSLETTER.pdf`),
    },
    {
      filename: 'Gesetzestext.pdf',
      file: fs.readFileSync(`${__dirname}/pdfs/hamburg-1/GESETZ.pdf`),
    },
  ],
  'brandenburg-1': [
    {
      filename: 'Tipps_zum_Unterschriftensammeln.pdf',
      file: fs.readFileSync(`${__dirname}/pdfs/brandenburg-1/TIPPS.pdf`),
    },
    {
      filename: 'Liste.pdf',
      type: 'MULTI',
    },
  ],
  'schleswig-holstein-1': [
    {
      filename: 'Tipps_zum_Unterschriftensammeln.pdf',
      file: fs.readFileSync(`${__dirname}/pdfs/sh-1/TIPPS.pdf`),
    },
    {
      filename: 'Liste_1er_SW.pdf',
      type: 'SINGLE_SW',
    },
    {
      filename: 'Liste_5er_SW.pdf',
      type: 'MULTI_SW',
    },
    {
      filename: 'Liste_1er_Farbe.pdf',
      type: 'SINGLE',
    },
    {
      filename: 'Liste_5er_Farbe.pdf',
      type: 'MULTI',
    },
  ],
  'bremen-1': [
    {
      filename: 'Liste.pdf',
      type: 'COMBINED',
    },
  ],
  'dibb-1': [
    {
      filename: 'Listen.pdf',
      type: 'COMBINED',
    },
  ],
  'direct-democracy-1': [
    {
      filename: 'Listen.pdf',
      type: 'SINGLE',
    },
  ],
};
