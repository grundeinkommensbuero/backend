//Construct campaign identifier, so we know, from where the user comes
const constructCampaignId = campaignCode => {
  const campaign = {};
  if (typeof campaignCode !== 'undefined') {
    //we want to remove the last characters from the string (brandenburg-2 -> brandenburg)
    campaign.state = campaignCode.substring(0, campaignCode.length - 2);
    //...and take the last char and save it as number
    campaign.round = parseInt(
      campaignCode.substring(campaignCode.length - 1, campaignCode.length)
    );
    campaign.code = campaignCode;
  }
  return campaign;
};

module.exports = { constructCampaignId };
