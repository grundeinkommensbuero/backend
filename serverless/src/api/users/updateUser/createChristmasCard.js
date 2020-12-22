const pdfLib = require('pdf-lib');
const fs = require('fs');
const fontkit = require('@pdf-lib/fontkit').default;

const file = fs.readFileSync(__dirname + '/Weihnachtskarte.pdf');
const fontBytes = fs.readFileSync(__dirname + '/idealbold.ttf');

module.exports.createChristmasCard = async (name, nameOfGifted, amount) => {
  const pdf = await pdfLib.PDFDocument.load(file);
  pdf.registerFontkit(fontkit);

  const page = pdf.getPage(0);

  const options = {
    font: await pdf.embedFont(fontBytes),
    // font: await pdf.embedFont(pdfLib.StandardFonts.HelveticaBold),
    color: pdfLib.rgb(0.94, 0.94, 0.94),
    size: 19,
  };

  page.drawText(`${nameOfGifted},`, { x: 82, y: 351, ...options });
  page.drawText(`${name}`, { x: 41, y: 63, ...options });
  page.drawText(`${amount} Euro`, { x: 185, y: 247, ...options });

  return pdf.save();
};
