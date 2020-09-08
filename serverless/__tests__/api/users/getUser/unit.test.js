const { anonymizeEmail } = require('../../../../src/api/users/getUser/utils');

describe('anonymize email util function tests', () => {
  it('should anonymize email correctly', async () => {
    const anonymizedEmail = anonymizeEmail('vali_schagerl@web.de');

    expect(anonymizedEmail).toEqual('v***********l@w*b.de');
  });

  it('should anonymize email correctly', async () => {
    const anonymizedEmail = anonymizeEmail(
      'valentin@expedition-grundeinkommen.de'
    );

    expect(anonymizedEmail).toEqual('v******n@e***********************n.de');
  });

  it('should anonymize email correctly with subdomains', async () => {
    const anonymizedEmail = anonymizeEmail('valentin@dev.web.de');

    expect(anonymizedEmail).toEqual('v******n@d*****b.de');
  });
});
