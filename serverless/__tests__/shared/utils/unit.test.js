const { constructCampaignId } = require('../../../src/shared/utils');

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
});
