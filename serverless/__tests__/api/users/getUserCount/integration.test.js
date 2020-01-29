const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('getUserCount api test', () => {
  it('should get user count', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/analytics/users`, request);
    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('schleswig-holstein-1');
    expect(json).toHaveProperty('brandenburg-1');

    expect(json['schleswig-holstein-1']).toHaveProperty('verifiedUsers');
    expect(json['schleswig-holstein-1']).toHaveProperty('unverifiedUsers');
    expect(json['schleswig-holstein-1']).toHaveProperty(
      'usersWithNewsletterConsent'
    );
    expect(json['schleswig-holstein-1']).toHaveProperty('pledgesMap');

    expect(json['schleswig-holstein-1'].verifiedUsers).toHaveProperty('count');
    expect(json['schleswig-holstein-1'].verifiedUsers).toHaveProperty(
      'signatures'
    );

    expect(
      json['schleswig-holstein-1'].usersWithNewsletterConsent
    ).toHaveProperty('count');
    expect(
      json['schleswig-holstein-1'].usersWithNewsletterConsent
    ).toHaveProperty('signatures');

    expect(json['schleswig-holstein-1'].unverifiedUsers).toHaveProperty(
      'count'
    );

    expect(json['schleswig-holstein-1'].verifiedUsers.count).toBeGreaterThan(0);
    expect(
      json['schleswig-holstein-1'].verifiedUsers.signatures
    ).toBeGreaterThan(0);
  });
});
