const fs = require('fs');

// Configuration for positions where the qr and barcodes
// should be placed for each campaign and their corresponding pdfs.
const CODE_POSITIONS = {
  B: {
    BARCODE: {
      x: 687,
      y: 24,
      width: 120,
      height: 55,
    },
    QRCODE: {
      x: 357,
      y: 25,
      width: 41,
      height: 41,
    },
  },
  B2: {
    BARCODE: {
      x: 710,
      y: 22,
      width: 95,
      height: 38,
    },
  },
  HH: {
    BARCODE: {
      x: 687,
      y: 24,
      width: 120,
      height: 55,
    },
    QRCODE: {
      x: 357,
      y: 38,
      width: 41,
      height: 41,
    },
  },
  BB: {
    BARCODE: {
      x: 540,
      y: 27,
      width: 120,
      height: 60,
    },
    QRCODE: {
      x: 685,
      y: 464,
      width: 39,
      height: 39,
    },
  },
  SH: {
    BARCODE_SINGLE: {
      x: 720,
      y: 28,
      width: 85,
      height: 37,
    },
    QRCODE_SINGLE: {
      x: 687,
      y: 449,
      width: 39,
      height: 39,
    },
    BARCODE_MULTI: {
      x: 517,
      y: 15,
      width: 110,
      height: 55,
    },
    QRCODE_MULTI: {
      x: 685.5,
      y: 464.5,
      width: 39,
      height: 39,
    },
  },
  DIBB: {
    BARCODE: {
      x: 545,
      y: 29,
      width: 120,
      height: 60,
    },
    QRCODE: {
      x: 693.5,
      y: 472.5,
      width: 39,
      height: 39,
    },
  },
  HB: {
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
  DFA: {
    BARCODE: {
      x: 680,
      y: 35,
      width: 120,
      height: 55,
    },
  },
};

// Here we define on which pages the qr and barcodes should be placed
// using the config above. There can be multiple different pdfs for each campaign.
module.exports = {
  anschreiben: {
    ANSCHREIBEN_GENERAL: {
      file: fs.readFileSync(__dirname + '/pdfs/letters/ANSCHREIBEN.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 85,
            y: 680,
          },
        },
      ],
    },

    ANSCHREIBEN_BB_PLATTFORM: {
      file: fs.readFileSync(
        __dirname + '/pdfs/letters/ANSCHREIBEN_BB_PLATTFORM.pdf'
      ),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 85,
            y: 680,
          },
        },
      ],
    },
  },

  'berlin-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/berlin-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.B.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.B.QRCODE,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/berlin-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.B.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.B.QRCODE,
        },
      ],
    },
    SINGLE: {
      file: fs.readFileSync(__dirname + '/pdfs/berlin-1/5er_FARBIG.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.B.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.B.QRCODE,
        },
      ],
    },
  },

  'berlin-2': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/berlin-2/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.B2.BARCODE,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/berlin-2/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.B2.BARCODE,
        },
      ],
    },
  },

  'hamburg-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/hamburg-1/ALLES.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.HH.QRCODE,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/hamburg-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.HH.QRCODE,
        },
      ],
    },
    SINGLE: {
      file: fs.readFileSync(__dirname + '/pdfs/hamburg-1/5er_FARBIG.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.HH.QRCODE,
        },
      ],
    },
  },

  'brandenburg-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/brandenburg-1/ALLES.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
    MULTI: {
      file: fs.readFileSync(__dirname + '/pdfs/brandenburg-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/brandenburg-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
    SINGLE_SW_ROTATED_LAW_FOR_PIN: {
      file: fs.readFileSync(
        __dirname + '/pdfs/brandenburg-1/5er_rotated_for_pin.pdf'
      ),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
  },

  'schleswig-holstein-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/sh-1/ALLES_sw.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.SH.BARCODE_SINGLE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.SH.QRCODE_SINGLE,
        },
        {
          type: 'BAR',
          page: 2,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 2,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/sh-1/1er_sw.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.SH.BARCODE_SINGLE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.SH.QRCODE_SINGLE,
        },
      ],
    },
    SINGLE: {
      file: fs.readFileSync(__dirname + '/pdfs/sh-1/1er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.SH.BARCODE_SINGLE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.SH.QRCODE_SINGLE,
        },
      ],
    },
    MULTI_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/sh-1/5er_sw.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
      ],
    },
    MULTI: {
      file: fs.readFileSync(__dirname + '/pdfs/sh-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
      ],
    },
  },

  'dibb-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/dibb-1/ALLES.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 2,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 2,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
    SINGLE_SW_ROTATED_LAW_FOR_PIN: {
      file: fs.readFileSync(
        __dirname + '/pdfs/brandenburg-1/5er_rotated_for_pin.pdf'
      ),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
  },

  'bremen-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/bremen-1/ALLES.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.HB.BARCODE,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.HB.QRCODE,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/bremen-1/8er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.HB.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.HB.QRCODE,
        },
      ],
    },
  },

  'democracy-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdfs/democracy-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.DFA.BARCODE,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdfs/democracy-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.DFA.BARCODE,
        },
      ],
    },
  },
};
