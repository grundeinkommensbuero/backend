module.exports.anonymizeEmail = email => {
  if (!email) return undefined;
  const [username, domain] = email.split('@');
  const usernameFirstLetter = username[0];
  const usernameLastLetter = username[username.length - 1];

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  // Join all of the subdomain to one string
  const subdomains = domainParts.slice(0, domainParts.length - 1).join('.');
  const firstSubdomainLetter = subdomains[0];
  const lastSubdomainLetter = subdomains[subdomains.length - 1];
  return `${usernameFirstLetter}***${usernameLastLetter}@${firstSubdomainLetter}***${lastSubdomainLetter}.${tld}`;
};
