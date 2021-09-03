const { INVOKE_URL } = require('../../../testConfig');
const fetch = require('node-fetch');

describe('createMeetup api test', () => {
  it('should create a new meetup', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        campaignCode: 'berlin-2',
        type: 'collect',
        coordinates: [40, 50],
        address: 'Warthe-Eck',
        endTime: '2021-08-20T09:00:00',
        startTime: '2021-08-20T09:00:00',
        description: 'Baskda asdkasjod asjdsaskd',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/meetups`, request);

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('meetup');
  });

  it('should create a new meetup with userId and contact', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: 'Sdasdlaskdlasdsac',
        campaignCode: 'berlin-2',
        type: 'collect',
        coordinates: [40, 50],
        address: 'Warthe-Eck',
        endTime: '2021-08-20T09:00:00',
        startTime: '2021-08-20T09:00:00',
        description: 'Baskda asdkasjod asjdsaskd',
        contact: 'Vali',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/meetups`, request);

    const json = await response.json();

    expect(response.status).toEqual(201);
    expect(json).toHaveProperty('meetup');
  });

  it('should have missing params', async () => {
    const request = {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({
        userId: 'Sdasdlaskdlasdsac',
        campaignCode: 'berlin-2',
        type: 'Sammeln',
        coordinates: [40, 50],
        startTime: '2021-08-20T09:00:00',
        description: 'Baskda asdkasjod asjdsaskd',
        contact: 'Vali',
      }),
    };

    const response = await fetch(`${INVOKE_URL}/meetups`, request);

    expect(response.status).toEqual(400);
  });
});
