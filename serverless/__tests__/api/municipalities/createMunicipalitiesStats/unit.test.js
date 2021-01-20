/**
 * Test computeStats function of getPlacesStats endpoint
 */

const uuid = require('uuid/v4');
const crypto = require('crypto-secure-random-digit');
const {
  timePassed,
  computeStats,
} = require('../../../../src/api/municipalities/createMunicipalitiesStats');

const populations = [
  40000 /*0*/,
  100 /*1*/,
  35000 /*2*/,
  50000 /*3*/,
  70000 /*4*/,
  30000 /*5*/,
  100000 /*6*/,
  2000000 /*7*/,
];
const users = [
  [320, 352], // 0 "new"
  [1, 4], // 1 –
  [250, 370], // 2 "win"
  [100, 400], // 3 "new"
  [500, 750], // 4 "win"
  [50, 250], // 5 -
  [370, 800], // 6 "change"
  [4000, 7000], // 7 "change"
];

const municipalities = [];

describe('Test computeStats', () => {
  beforeAll(() => {
    // Create test data
    for (let i = 0; i < populations.length; i++) {
      const ags = crypto.randomDigits(6).join('');
      for (let j = 0; j < users[i][0]; j++) {
        municipalities.push({
          ags,
          population: populations[i],
          users: [],
          createdAt: new Date(
            new Date().getTime() - timePassed - 10000
          ).toISOString(),
          userId: uuid(),
        });
      }

      const change = users[i][1] - users[i][0];
      for (let j = 0; j < change; j++) {
        municipalities.push({
          ags,
          population: populations[i],
          users: [],
          createdAt: new Date().toISOString(),
          userId: uuid(),
        });
      }
    }
  });

  it('should compute stats', async () => {
    const stats = await computeStats({
      userMuncipality: municipalities,
      shouldSendAllMunicipalities: false,
    });

    expect(stats).toHaveProperty('events');
    expect(stats).toHaveProperty('municipalities');

    const count = {
      win: 0,
      change: 0,
      new: 0,
    };

    for (const event of stats.events) {
      count[event.category]++;
    }

    expect(count.win).toEqual(2);
    expect(count.change).toEqual(2);
    expect(count.new).toEqual(2);
    expect(stats.events.length).toEqual(6);
    expect(stats.municipalities.length).toEqual(8);
  });
});
