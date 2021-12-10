const pdfLib = require('pdf-lib');
const fs = require('fs');
const fontkit = require('@pdf-lib/fontkit').default;

const file = fs.readFileSync(__dirname + '/lotteryCard.pdf');
const boldFontBytes = fs.readFileSync(__dirname + '/idealbold.ttf');
const fontBytes = fs.readFileSync(__dirname + '/idealregular.ttf');

module.exports.createLotteryCard = async (username, id) => {
  const pdf = await pdfLib.PDFDocument.load(file);
  pdf.registerFontkit(fontkit);

  const page = pdf.getPage(0);

  const options = {
    size: 19,
  };

  page.drawText(
    `Hallo${username ? ` ${username}` : ''}, \nDeine Los-Nummer ist `,
    {
      x: 38,
      y: 100,
      ...options,
      font: await pdf.embedFont(fontBytes),
    }
  );

  page.drawText(`#${id}.`, {
    x: 235,
    y: 76,
    ...options,
    font: await pdf.embedFont(boldFontBytes),
  });

  page.drawText('Viel Erfolg bei der Verlosung!', {
    x: 38,
    y: 50,
    ...options,
    font: await pdf.embedFont(fontBytes),
  });

  return pdf.save();
};
