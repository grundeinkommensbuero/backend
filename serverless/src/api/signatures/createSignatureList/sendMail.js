const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES();

// const htmlMail = require('./mailTemplate.html').default;

const ADDRESSES = {
  'brandenburg-1': `
  Expedition Grundeinkommen<br>
  Karl-Marx-Strasse 50<br>
  12043 Berlin
  `,
  'berlin-1': `
  Expedition Grundeinkommen<br>
  Karl-Marx-Strasse 50<br>
  12043 Berlin
  `,
  'schleswig-holstein-1': `
  Johannes Wagner<br>
  Postfach 1104<br>
  24585 Nortorf
  `,
};

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
};

//Functions which sends an email with the attached pdf and returns a promise
const sendMail = (email, attachments, campaign) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: `Deine Unterschriftenliste für "${
      STATES[campaign.state]
    } soll Grundeinkommen testen!" im Anhang`,
    html: customEmail(campaign),
    to: email,
    attachments: attachments,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

const customEmail = campaign => {
  let optionalText1 = '';

  if (campaign.state === 'hamburg') {
    optionalText1 = `Die Unterschriftenliste und die Liste für E-Mail-Adressen
    („Auf dem Laufenden bleiben“) müssen  jeweils auf getrennte Blätter gedruckt
    werden. Ganz wichtig: Der Gesetzentwurf (ebenfalls im Anhang) muss immer mitgeführt
    werden. Interessierte Personen sollen die Möglichkeit haben, vor Ort beim
    Unterschreiben hineingucken und selbst nachlesen zu können. Den Gesetzentwurf
    beim Sammeln in mehrfacher Ausführung dabei zu haben, ist daher sinnvoll.
    `;
  }

  return htmlMail
    .replace(/\[\[OPTIONAL_TEXT_1\]\]/gi, optionalText1)
    .replace(/\[\[ADDRESS\]\]/gi, ADDRESSES[campaign.code]);
};

module.exports = sendMail;
