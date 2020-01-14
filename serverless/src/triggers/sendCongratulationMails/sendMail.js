const AWS = require('aws-sdk');
const nodemailer = require('nodemailer');
const ses = new AWS.SES({ region: 'eu-central-1' });
const fs = require('fs');

const htmlMail = fs.readFileSync(__dirname + '/mailTemplate.html', 'utf8');

const GOALS = {
  'schleswig-holstein-1': '25.000',
  'brandenburg-1': '25.000',
};

//Function which sends an email to congratulate for the reception of list(s)
//gets a user object, which is why we destructure the object
const sendMail = (
  { email, username, userId, dailyCount, totalCount, campaignCode },
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
  //username might be in different forms, definitely need to refactor
  if (typeof username !== 'undefined' && username !== 'empty') {
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

  Ein großes Danke dafür!
  <br><br>
  Bitte sammle auch weiter Unterschriften. Zusammen haben wir im Moment ${totalCountForAllUsers} von ${
    GOALS[campaign.code]
  } benötigten Unterschriften gesammelt.
  Wir haben also noch etwas vor uns.
  `;

  let ctaText;
  if (totalCount > 5) {
    ctaText =
      'Wie können wir dich beim weiteren Sammeln unterstützen? Antworte gern auf diese E-Mail!';
  } else if (totalCount > 1) {
    ctaText = `Du kennst noch mehr Menschen, die auch für ein Grundeinkommensexperiment unterschreiben könnten? Bitte lass sie auch mit unterschreiben!
    Du kannst auch Listen in der Bäckerei oder im Supermarkt um die Ecke auslegen. Trag dann bitte den neuen Sammelort in unsere <a class="link" href="https://expedition-grundeinkommen.de/${campaign.region}/#karte">Sammellandkarte</a> ein.`;
  } else {
    ctaText =
      'Kennst du noch Menschen in deinem Umfeld, die auch für einen Modellversuch zum Grundeinkommen unterschreiben könnten? Bitte lass sie auch unterschreiben! ';
  }

  return htmlMail
    .replace(/\[\[CUSTOM_GREETING\]\]/gi, greeting)
    .replace(/\[\[CUSTOM_PREHEADER\]\]/gi, preheader)
    .replace(/\[\[CUSTOM_TEXT\]\]/gi, text)
    .replace(/\[\[CUSTOM_CTA_TEXT\]\]/gi, ctaText)
    .replace(/\[\[USER_ID\]\]/gi, userId)
    .replace(/\[\[CAMPAIGN_CODE\]\]/gi, campaign.code);
};

module.exports = sendMail;
