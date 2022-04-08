const {
  constructCampaignId,
  validateEmail,
  validateZipCode,
  formatPhoneNumber,
  validatePhoneNumber,
  validateDate,
} = require('../../../src/shared/utils');

describe('util functions tests', () => {
  it('should construct sh1 campaign id', async () => {
    const campaignId = constructCampaignId('schleswig-holstein-1');

    expect(campaignId).toEqual({
      state: 'schleswig-holstein',
      round: 1,
      code: 'schleswig-holstein-1',
    });
  });

  it('should construct bb2 campaign id', async () => {
    const campaignId = constructCampaignId('brandenburg-2');

    expect(campaignId).toEqual({
      state: 'brandenburg',
      round: 2,
      code: 'brandenburg-2',
    });
  });

  it('should handle undefined campaign id', async () => {
    const campaignId = constructCampaignId();

    expect(campaignId).toEqual({});
  });

  it('should validate email', async () => {
    const result = validateEmail('vali_schagerl@web.de');

    expect(result).toEqual(true);
  });

  it('should validate email', async () => {
    const result = validateEmail('vali.schagerl@gmail.com');

    expect(result).toEqual(true);
  });

  it('should validate email', async () => {
    const result = validateEmail('valentin@expedition-grundeinkommen.de');

    expect(result).toEqual(true);
  });

  it('should not validate email', async () => {
    const result = validateEmail('vali_schagerl@web.');

    expect(result).toEqual(false);
  });

  it('should validate email', async () => {
    const result = validateEmail('vali_schagerl@web');

    expect(result).toEqual(false);
  });

  it('should validate email', async () => {
    const result = validateEmail('vali_schagerlweb.de');

    expect(result).toEqual(false);
  });

  it('should not validate email', async () => {
    const result = validateEmail('vali_schagerl@');

    expect(result).toEqual(false);
  });

  it('should not validate email', async () => {
    const result = validateEmail('@gmail.com');

    expect(result).toEqual(false);
  });

  it('should validate zip code', async () => {
    const result = validateZipCode('72074');

    expect(result).toEqual(true);
  });

  it('should validate zip code', async () => {
    const result = validateZipCode('12051');

    expect(result).toEqual(true);
  });

  it('should validate zip code', async () => {
    const result = validateZipCode('02104');

    expect(result).toEqual(true);
  });

  it('should validate number zip code', async () => {
    const result = validateZipCode(72074);

    expect(result).toEqual(true);
  });

  it('should not validate zip code', async () => {
    const result = validateZipCode('a2074');

    expect(result).toEqual(false);
  });

  it('should not validate zip code', async () => {
    const result = validateZipCode('2074');

    expect(result).toEqual(false);
  });

  it('should not validate zip code', async () => {
    const result = validateZipCode('222074');

    expect(result).toEqual(false);
  });

  it('should not validate number zip code', async () => {
    const result = validateZipCode(2074);

    expect(result).toEqual(false);
  });

  it('should format phone number', async () => {
    const result = formatPhoneNumber('06442 / 3893023');

    expect(result).toEqual('064423893023');
  });

  it('should format phone number', async () => {
    const result = formatPhoneNumber('+496442 / 3893023');

    expect(result).toEqual('004964423893023');
  });

  it('should format phone number', async () => {
    const result = formatPhoneNumber('+49 (173) 1799 806-44');

    expect(result).toEqual('0049173179980644');
  });

  it('should format phone number', async () => {
    const result = formatPhoneNumber('+491517953677');

    expect(result).toEqual('00491517953677');
  });

  it('should format phone number', async () => {
    const result = formatPhoneNumber('01517953677');

    expect(result).toEqual('01517953677');
  });

  it('should format int phone number', async () => {
    const result = formatPhoneNumber(1517953677);

    expect(result).toEqual('1517953677');
  });

  it('should validate phone number', async () => {
    const result = validatePhoneNumber(1517953677);

    expect(result).toEqual(true);
  });

  it('should validate phone number', async () => {
    const result = validatePhoneNumber('00491517953677');

    expect(result).toEqual(true);
  });

  it('should validate phone number', async () => {
    const result = validatePhoneNumber('091517953677');

    expect(result).toEqual(true);
  });

  it('should not validate phone number', async () => {
    const result = validatePhoneNumber('+491517953677');

    expect(result).toEqual(false);
  });

  it('should not validate phone number', async () => {
    const result = validatePhoneNumber('0151a7953677');

    expect(result).toEqual(false);
  });

  it('should not validate phone number', async () => {
    const result = validatePhoneNumber('0049 1517953677');

    expect(result).toEqual(false);
  });

  it('should validate date', async () => {
    const result = validateDate('2022-06-12');

    expect(result).toEqual(true);
  });

  // Not a real date, but my validation function doesn't test it, so should be true
  it('should validate date', async () => {
    const result = validateDate('2022-18-12');

    expect(result).toEqual(true);
  });

  it('should not validate date', async () => {
    const result = validateDate('2022/06/12');

    expect(result).toEqual(false);
  });

  it('should not validate date', async () => {
    const result = validateDate('12.06.2022');

    expect(result).toEqual(false);
  });

  it('should not validate date', async () => {
    const result = validateDate('12-06-2022');

    expect(result).toEqual(false);
  });
});
