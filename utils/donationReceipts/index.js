const fs = require('fs');
const parse = require('csv-parse');
const pdfLib = require('pdf-lib');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');

const ses = new AWS.SES({ region: 'eu-central-1' });
const pathToDonors = './spendenbescheinigungen.csv';
const file = fs.readFileSync('./vorlage.pdf');
const logo = fs.readFileSync('./logo.jpg');

const generateReceipts = async () => {
  const users = await readCsv();

  for (const user of users) {
    const pdf = await generatePdf(user);

    await sendMail(user, pdf);
  }
};

const generatePdf = async ({
  firstname,
  lastname,
  street,
  zipCode,
  city,
  country,
  company,
  amount,
  amountInWords,
  date,
}) => {
  const pdf = await pdfLib.PDFDocument.load(file);
  const page = pdf.getPage(0);

  const { width, height } = page.getSize();
  const options = {
    font: await pdf.embedFont(pdfLib.StandardFonts.HelveticaBold),
    color: pdfLib.rgb(0, 0, 0),
    size: 9,
    lineHeight: 6,
  };

  page.drawText(
    `
  ${firstname} ${lastname}${company ? `, ${company}` : ''} \n
  ${street}\n
  ${zipCode} ${city}, ${country}
  `,
    { x: 45, y: height - 160, ...options }
  );

  page.drawText(`${amount} Euro`, {
    x: 50,
    y: height - 235,
    ...options,
  });

  page.drawText(
    `${amountInWords.charAt(0).toUpperCase()}${amountInWords.slice(1)} ${
      amountInWords.includes('Euro') ? '' : 'Euro'
    }`,
    {
      x: 180,
      y: height - 235,
      ...options,
    }
  );

  page.drawText(`${date.replace('.20', '.2020')}`, {
    x: 435,
    y: height - 235,
    ...options,
  });

  const image = await pdf.embedJpg(logo);

  const imageSize = image.scale(0.04);

  page.drawImage(image, {
    x: width - 170,
    y: height - 80,
    width: imageSize.width,
    height: imageSize.height,
  });

  const filledPdf = await pdf.save();

  fs.writeFileSync(`./pdfs/${firstname}${lastname}${zipCode}.pdf`, filledPdf);

  return filledPdf;
};

const sendMail = async ({ email, firstname }, pdf) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Deine Spendenbescheinigung',
    html: customMail(firstname),
    to: email,
    attachments: [
      {
        filename: 'Spendenbescheinigung.pdf',
        contentType: 'application/pdf',
        content: Buffer.from(pdf, 'base64'),
      },
    ],
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  console.log('About to send email to', email);

  return transporter.sendMail(mailOptions);
};

const readCsv = () => {
  return new Promise(resolve => {
    const users = [];
    let count = 0;
    fs.createReadStream(pathToDonors)
      .pipe(parse({ delimiter: ',' }))
      .on('data', row => {
        let user;
        // leave out headers
        if (count > 0) {
          console.log('row', row);
          user = {
            email: row[0],
            firstname: row[1],
            lastname: row[2],
            company: row[3],
            street: row[4],
            zipCode: row[5],
            city: row[6],
            country: row[7],
            date: row[8],
            amount: row[9],
            amountInWords: row[10],
          };

          if (typeof user !== 'undefined') {
            users.push(user);
          } else {
            console.log('user undefined', user);
          }
        }

        count++;
      })
      .on('end', () => {
        console.log('finished parsing');
        resolve(users);
      });
  });
};

const customMail = firstname => `
Hallo ${firstname},
<br /><br />
anbei findest du die Spendenbescheinigung für deine Unterstützung 
unseres Crowdfundings "Jetzt erst recht: Volksentscheid zum Grundeinkommen!" auf Startnext.
<br /><br />
Mit deiner Spende hast du einen wichtigen Beitrag dazu geleistet, 
dass wir trotz Kontaktbeschränkungen weiter Unterschriften für 
den Modellversuch zum Grundeinkommen sammeln konnten. Dafür noch einmal herzlichen Dank!
<br /><br />
Falls du noch nicht zu unserem Newsletter angemeldet bist, kannst du dich hier anmelden, 
um informiert zu bleiben: <a href="https://expedition-grundeinkommen.de/newsletter" alt="Link zur Newsletteranmeldung">https://expedition-grundeinkommen.de/newsletter</a>.
<br /><br />
Gemeinsam lassen wir den Modellversuch zum bedingungslosen Grundeinkommen politische Wirklichkeit werden.
<br /><br />
Herzlich<br/>
Dein Expeditionsteam
`;

generateReceipts();