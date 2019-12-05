const fs = require('fs');

//Parses the users array to a string and saves it as csv file
module.exports.generateCsv = (stats, campaign) => {
  let dataString =
    'Email, Name, Anzahl Unterschriften, Auf Strasse sammeln, PLZ\n';
  const powerUsers = stats[campaign].powerUsers;
  for (let user of powerUsers) {
    //for now we just expect a user to only have one pledge
    dataString += `${user.email},${user.username},${
      user.pledges[0].signatureCount
    },${user.pledges[0].wouldCollectSignaturesInPublicSpaces ? 'Ja' : 'Nein'},${
      user.zipCode
    }\n`;
  }
  fs.writeFileSync(`powerusers-${campaign}.csv`, dataString);
};
