const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES();
const fs = require('fs');

const htmlMail = fs.readFileSync(__dirname + '/mailTemplate.html', 'utf8');

//Functions which sends an email with the attached pdf and returns a promise
const sendMail = (email, attachments, campaign) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: 'Deine Unterschriftenliste',
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
  let optionalText2 = '';

  if (campaign.state === 'hamburg') {
    optionalText1 = `Ganz wichtig: Der Gesetzentwurf (ebenfalls im Anhang) muss immer mitgeführt werden. 
    Interessierte Personen sollen die Möglichkeit haben, vor Ort beim Unterschreiben hineingucken 
    und selbst nachlesen zu können. Den Gesetzentwurf beim Sammeln in mehrfacher Ausführung dabei zu haben, ist daher sinnvoll. 
    Unterschriftenliste und "auf dem Laufenden bleiben" Liste sollten außerdem getrennt voneinander ausgedruckt werden.
    
    `;

    optionalText2 = `Tipps zum Sammeln findest du in den bereits existierenden 
    <a href="https://expedition-grundeinkommen.de/downloads/">Sammelleitfäden</a> 
    auf unserer Webseite. Bald wird es auch einen eigenen Hamburger Sammelleitfaden geben.`;
  }

  return htmlMail
    .replace(/\[\[OPTIONAL_TEXT_1\]\]/gi, optionalText1)
    .replace(/\[\[OPTIONAL_TEXT_2\]\]/gi, optionalText2);
};

module.exports = sendMail;
