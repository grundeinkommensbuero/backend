const fs = require('fs');

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
      y: 38,
      width: 41,
      height: 41,
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
      x: 545,
      y: 17,
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
};

module.exports = {
  'berlin-1': {
    SINGLE_SW: {
      file: fs.readFileSync(__dirname + '/pdf/berlin-1/5er.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.B.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.B.QRCODE,
        },
      ],
    },
    SINGLE: {
      file: fs.readFileSync(__dirname + '/pdf/berlin-1/5er_FARBIG.pdf'),
      codes: [
        {
          type: 'BAR',
          page: 0,
          position: CODE_POSITIONS.B.BARCODE,
        },
        {
          type: 'QR',
          page: 0,
          position: CODE_POSITIONS.B.QRCODE,
        },
      ],
    },
  },
  'hamburg-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/ALLES.pdf'),
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
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/5er.pdf'),
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
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/5er_FARBIG.pdf'),
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
    SERIENBRIEF2: {
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/SERIENBRIEF_2.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 2,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 2,
          position: CODE_POSITIONS.HH.QRCODE,
        },
      ],
    },
    SERIENBRIEF5: {
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/SERIENBRIEF_5.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 2,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 2,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 4,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 4,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.HH.QRCODE,
        },
      ],
    },
    SERIENBRIEF15: {
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/SERIENBRIEF_15.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 2,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 2,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 4,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 4,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 6,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 6,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 7,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 7,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 8,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 8,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 9,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 9,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 10,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 10,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 11,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 11,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 12,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 12,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 13,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 13,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 14,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 14,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 15,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 15,
          position: CODE_POSITIONS.HH.QRCODE,
        },
      ],
    },
    SERIENBRIEF30: {
      file: fs.readFileSync(__dirname + '/pdf/hamburg-1/SERIENBRIEF_30.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 2,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 2,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 4,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 4,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 6,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 6,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 7,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 7,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 8,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 8,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 9,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 9,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 10,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 10,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 11,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 11,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 12,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 12,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 13,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 13,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 14,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 14,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 15,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 15,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 16,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 16,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 17,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 17,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 18,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 18,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 19,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 19,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 20,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 20,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 21,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 21,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 22,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 22,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 23,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 23,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 24,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 24,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 25,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 25,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 26,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 26,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 27,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 27,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 28,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 28,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 29,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 29,
          position: CODE_POSITIONS.HH.QRCODE,
        },
        {
          type: 'BAR',
          page: 30,
          position: CODE_POSITIONS.HH.BARCODE,
        },
        {
          type: 'QR',
          page: 30,
          position: CODE_POSITIONS.HH.QRCODE,
        },
      ],
    },
  },
  'brandenburg-1': {
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdf/brandenburg-1/ALLES.pdf'),
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
      file: fs.readFileSync(__dirname + '/pdf/brandenburg-1/5er.pdf'),
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
    SERIENBRIEF2: {
      file: fs.readFileSync(__dirname + '/pdf/brandenburg-1/SERIENBRIEF_2.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
    SERIENBRIEF5: {
      file: fs.readFileSync(__dirname + '/pdf/brandenburg-1/SERIENBRIEF_5.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 7,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 7,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 9,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 9,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
    SERIENBRIEF15: {
      file: fs.readFileSync(
        __dirname + '/pdf/brandenburg-1/SERIENBRIEF_15.pdf'
      ),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 7,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 7,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 9,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 9,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 11,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 11,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 13,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 13,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 15,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 15,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 17,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 17,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 19,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 19,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 21,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 21,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 23,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 23,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 25,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 25,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 27,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 27,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 29,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 29,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
    SERIENBRIEF30: {
      file: fs.readFileSync(
        __dirname + '/pdf/brandenburg-1/SERIENBRIEF_30.pdf'
      ),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 7,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 7,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 9,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 9,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 11,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 11,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 13,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 13,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 15,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 15,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 17,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 17,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 19,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 19,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 21,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 21,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 23,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 23,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 25,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 25,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 27,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 27,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 29,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 29,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 31,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 31,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 33,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 33,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 35,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 35,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 37,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 37,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 39,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 39,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 41,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 41,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 43,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 43,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 45,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 45,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 47,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 47,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 49,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 49,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 51,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 51,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 53,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 53,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 55,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 55,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 57,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 57,
          position: CODE_POSITIONS.BB.QRCODE,
        },
        {
          type: 'BAR',
          page: 59,
          position: CODE_POSITIONS.BB.BARCODE,
        },
        {
          type: 'QR',
          page: 59,
          position: CODE_POSITIONS.BB.QRCODE,
        },
      ],
    },
  },
  'schleswig-holstein-1': {
    SERIENBRIEF2: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/SERIENBRIEF_2.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
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
    SERIENBRIEF5: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/SERIENBRIEF_5.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
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
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 4,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 4,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
      ],
    },
    SERIENBRIEF15: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/SERIENBRIEF_15.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
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
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 4,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 4,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 6,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 6,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 7,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 7,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 8,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 8,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 9,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 9,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 10,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 10,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 11,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 11,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 12,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 12,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 13,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 13,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 14,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 14,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 15,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 15,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
      ],
    },
    SERIENBRIEF30: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/SERIENBRIEF_30.pdf'),
      codes: [
        {
          type: 'ADDRESS',
          page: 0,
          position: {
            x: 67,
            y: 660,
          },
        },
        {
          type: 'BAR',
          page: 1,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 1,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
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
        {
          type: 'BAR',
          page: 3,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 3,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 4,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 4,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 5,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 5,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 6,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 6,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 7,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 7,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 8,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 8,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 9,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 9,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 10,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 10,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 11,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 11,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 12,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 12,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 13,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 13,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 14,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 14,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 15,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 15,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 16,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 16,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 17,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 17,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 18,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 18,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 19,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 19,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 20,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 20,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 21,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 21,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 22,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 22,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 23,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 23,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 24,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 24,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 25,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 25,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 26,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 26,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 27,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 27,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 28,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 28,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 29,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 29,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
        {
          type: 'BAR',
          page: 30,
          position: CODE_POSITIONS.SH.BARCODE_MULTI,
        },
        {
          type: 'QR',
          page: 30,
          position: CODE_POSITIONS.SH.QRCODE_MULTI,
        },
      ],
    },
    COMBINED: {
      file: fs.readFileSync(__dirname + '/pdf/sh-1/ALLES_sw.pdf'),
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
      file: fs.readFileSync(__dirname + '/pdf/sh-1/1er_sw.pdf'),
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
      file: fs.readFileSync(__dirname + '/pdf/sh-1/1er.pdf'),
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
      file: fs.readFileSync(__dirname + '/pdf/sh-1/5er_sw.pdf'),
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
      file: fs.readFileSync(__dirname + '/pdf/sh-1/5er.pdf'),
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
};
