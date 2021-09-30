const { INVOKE_URL } = require('../../../../testConfig');
const fetch = require('node-fetch');

describe('get interactions api test', () => {
  it('should get most recent interactions', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(`${INVOKE_URL}/interactions`, request);

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('interactions');
    expect(json.interactions[0]).toHaveProperty('user');
  });

  it('should get most recent interactions with limit', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/interactions?limit=20`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('interactions');
    expect(json.interactions[0]).toHaveProperty('user');
  });

  it('should get most recent interactions with type', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/interactions?type=pledgePackage`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('interactions');
    expect(json.interactions[0]).toHaveProperty('user');
    expect(json.interactions[0]).toHaveProperty('type');
    expect(json.interactions[0].type).toEqual('pledgePackage');
  });

  it('should get most recent interactions with campaignCode', async () => {
    const request = {
      method: 'GET',
      mode: 'cors',
    };

    const response = await fetch(
      `${INVOKE_URL}/interactions?campaignCode=berlin-2`,
      request
    );

    const json = await response.json();

    expect(response.status).toEqual(200);
    expect(json).toHaveProperty('interactions');
    expect(json.interactions[0]).toHaveProperty('user');
    expect(json.interactions[0]).toHaveProperty('campaign');
    expect(json.interactions[0].campaign.code).toEqual('berlin-2');
  });
});
