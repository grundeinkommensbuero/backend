const fs = require('fs');
const parse = require('csv-parse');
const pdfLib = require('pdf-lib');
const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const inWords = require('in-words').de;

const ses = new AWS.SES({ region: 'eu-central-1' });
const pathToDonors = './spendenbescheinigungen_olympia.csv';
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
  date,
  index,
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

  const splitAmount = amount.split(',');
  const euroInWords = inWords(splitAmount[0]);
  // Transform something like ,2 to ,20
  let cents;
  if (splitAmount[1]) {
    cents = splitAmount[1].length > 1 ? splitAmount[1] : `${splitAmount[1]}0`;
  } else {
    cents = null;
  }

  const centsInWords = cents ? inWords(cents) : null;

  page.drawText(`${splitAmount[0]}${cents ? `,${cents}` : ''} Euro`, {
    x: 50,
    y: height - 235,
    ...options,
  });

  page.drawText(
    `${euroInWords.charAt(0).toUpperCase()}${euroInWords.slice(1)} Euro${
      centsInWords
        ? ` ${centsInWords.charAt(0).toUpperCase()}${centsInWords.slice(
            1
          )} Cent`
        : ''
    }`,
    {
      x: 180,
      y: height - 235,
      ...options,
    }
  );

  page.drawText(`${date}`, {
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

  fs.writeFileSync(
    `./pdfs/${firstname}${lastname.replace('/', '')}${index}.pdf`,
    filledPdf
  );

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
          user = {
            email: row[1],
            firstname: row[3],
            lastname: row[4],
            company: row[5],
            street: row[6],
            zipCode: row[7],
            city: row[8],
            country: row[9],
            date: row[12],
            amount: row[13],
            index: count,
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
unseres Olympia12062020-Crowdfundings "Grundeinkommen jetzt. Mit deiner Hilfe".
<br /><br />
Dank Euch und der Olympia-Challenge bringen wir jetzt einen bundesweiten Modellversuch 
zum Grundeinkommen mit mindestens 10.000 Teilnehmenden per Volksgesetzgebung 
an den Start - aus der Bevölkerung heraus mit direktdemokratischen Mitteln. 
Ab jetzt könnt ihr deutschlandweit eure Stadt oder Gemeinde dafür qualifizieren. Meldet Euch an:  <br/>
<a href="https://expedition-grundeinkommen.de" alt="Link zur Anmeldung">https://expedition-grundeinkommen.de/</a>
<br /><br />
Das angehängte PDF ist das Original, das du ausdrucken und für deine Steuererklärung nutzen kannst. 
Du erhältst keine zusätzliche postalische Spendenbescheinigung. 
<br /><br />
Wenn du innerhalb des letzten Jahres umgezogen bist, ist das kein Problem. 
Solange die Adresse zum Zeitpunkt deiner Spende(n) jeweils aktuell war, 
akzeptiert das Finanzamt die Spendenbescheinigung auch mit einer neuen Adresse.
<br /><br />
Gemeinsam lassen wir den Modellversuch zum bedingungslosen Grundeinkommen politische Wirklichkeit werden.
<br /><br />
Viele Grüße<br/>
Lucia
`;

generateReceipts();
