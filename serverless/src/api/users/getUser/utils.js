module.exports.anonymizeEmail = email => {
  if (!email) return undefined;
  const emailParts = email.split('@');
  const firstLetter = emailParts[0][0];
  const lastLetter = emailParts[0][emailParts[0].length - 1];
  return `${firstLetter}***${lastLetter}@${emailParts[1]}`;
};
