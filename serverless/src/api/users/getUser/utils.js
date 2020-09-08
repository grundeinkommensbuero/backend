module.exports.anonymizeEmail = email => {
  if (!email) return undefined;
  const [username, domain] = email.split('@');

  // We keep the first and last char before @ and replace every other char with *
  const anonymizedUsername = `${username[0]}${'*'.repeat(username.length - 2)}${
    username[username.length - 1]
  }`;

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  // Join all of the subdomain to one string
  const subdomains = domainParts.slice(0, domainParts.length - 1).join('.');

  // We keep the first and last char before @ and replace every other char with *
  const anonymizedSubdomains = `${subdomains[0]}${'*'.repeat(
    subdomains.length - 2
  )}${subdomains[subdomains.length - 1]}`;

  return `${anonymizedUsername}@${anonymizedSubdomains}.${tld}`;
};
