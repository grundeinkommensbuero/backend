const fs = require('fs');

const CODE_POSITIONS = {
  BARCODE_SINGLE: {
    x: 752,
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
    x: 535,
    y: 20,
    width: 90,
    height: 40,
  },
  QRCODE_MULTI: {
    x: 685,
    y: 464,
    width: 39,
    height: 39,
  },
};

module.exports = {
  'brandenburg-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdf/brandenburg-1/ALLES.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.QRCODE_MULTI,
        },
      ],
    },
  },
  'schleswig-holstein-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/ALLES_sw.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.BARCODE_SINGLE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.QRCODE_SINGLE,
        },
        {
          type: 'BAR',
          page: 2,
          position: CODE_POSITIONS.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 2,
          position: CODE_POSITIONS.QRCODE_MULTI,
        },
      ],
    },
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/1er_sw.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BARCODE_SINGLE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.QRCODE_SINGLE,
        },
      ],
    },
    SINGLE: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/1er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BARCODE_SINGLE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.QRCODE_SINGLE,
        },
      ],
    },
    MULTI_SW: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/5er_sw.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.QRCODE_MULTI,
        },
      ],
    },
    MULTI: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.QRCODE_MULTI,
        },
      ],
    },
  },
};
