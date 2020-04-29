const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES({ region: 'eu-central-1' });

const htmlMail = require('./mailTemplate.html').default;
const htmlMailHamburg = require('./mailTemplateHamburg.html').default;

const GOALS = {
  'schleswig-holstein-1': '25000',
  'brandenburg-1': '25000',
  'hamburg-1': '12000',
  'bremen-1': '6000',
  'berlin-1': '24000',
};

const STATES = {
  'schleswig-holstein': 'Schleswig-Holstein',
  brandenburg: 'Brandenburg',
  hamburg: 'Hamburg',
  berlin: 'Berlin',
  bremen: 'Bremen',
};

//Function which sends an email to congratulate for the reception of list(s)
//gets a user object, which is why we destructure the object
const sendMail = (
  { email, username, userId, dailyCount, totalCount, campaign },
  totalCountForAllUsers
) => {
  const mailOptions = {
    from: 'Expedition Grundeinkommen <support@expedition-grundeinkommen.de',
    subject: `${dailyCount} Unterschriften sind eingegangen!`,
    html: customMail(
      dailyCount,
      totalCount,
      totalCountForAllUsers,
      username,
      userId,
      campaign
    ),
    to: email,
  };

  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: ses,
  });

  return transporter.sendMail(mailOptions);
};

//construct an email depending on the signature count
const customMail = (
  dailyCount,
  totalCount,
  totalCountForAllUsers,
  username,
  userId,
  campaign
) => {
  let greeting;
  let preheader =
    dailyCount > 1
      ? `Herzlichen Dank! Wir haben heute ${dailyCount} Unterschriften von dir erhalten.`
      : `Herzlichen Dank! Wir haben heute ${dailyCount} Unterschrift von dir erhalten.`;

  //if there is a username we want to have a specific greeting
  if (typeof username !== 'undefined') {
    greeting = `Hallo ${username},`;
  } else {
    greeting = 'Hallo,';
  }

  //if the total count is different than the daily count
  //we are going to send a different text in the mail
  const text = `vor einiger Zeit hast du Unterschriftslisten für die Expedition Grundeinkommen heruntergeladen.
  ${dailyCount} Unterschrift${dailyCount > 1 ? 'en' : ''} kam${
    dailyCount > 1 ? 'en' : ''
  } heute zu uns zurück. ${
    totalCount > dailyCount
      ? `Damit hast du insgesamt schon ${totalCount} Unterschriften beigetragen. `
      : ''
  }
  <br><br>
  Ein großes Danke dafür!
  ${
    campaign.code !== 'hamburg-1'
      ? `
  <br><br>
  Bitte sammle auch weiter Unterschriften. Zusammen haben wir im Moment ${totalCountForAllUsers} von ${
          GOALS[campaign.code]
        } benötigten Unterschriften in ${STATES[campaign.state]} gesammelt.
  Wir haben also noch etwas vor uns.
  `
      : ''
  }`;

  let ctaText;
  if (totalCount > 5) {
    ctaText =
      'Wie können wir dich beim weiteren Sammeln unterstützen? Antworte gern auf diese E-Mail!';
  } else if (totalCount > 1) {
    ctaText = ` Du kennst noch mehr Menschen, die auch für ein Grundeinkommensexperiment unterschreiben könnten? 
    Bitte lass sie auch mit unterschreiben! Du kannst auch Listen in deinem Treppenhaus auslegen oder deinen 
    Nachbarn in den Briefkasten werfen. Einen Vordruck dafür findest du <a href="http://expedition-grundeinkommen.de/briefkasten">hier</a>.
    `;
  } else {
    ctaText =
      'Kennst du noch Menschen in deinem Umfeld, die auch für einen Modellversuch zum Grundeinkommen unterschreiben könnten? Bitte lass sie auch unterschreiben! ';
  }

  const mail = campaign.code === 'hamburg-1' ? htmlMailHamburg : htmlMail;

  return mail
    .replace(/\[\[CUSTOM_GREETING\]\]/gi, greeting)
    .replace(/\[\[CUSTOM_PREHEADER\]\]/gi, preheader)
    .replace(/\[\[CUSTOM_TEXT\]\]/gi, text)
    .replace(/\[\[CUSTOM_CTA_TEXT\]\]/gi, ctaText)
    .replace(/\[\[USER_ID\]\]/gi, userId)
    .replace(/\[\[CAMPAIGN_CODE\]\]/gi, campaign.code);
};

module.exports = sendMail;
