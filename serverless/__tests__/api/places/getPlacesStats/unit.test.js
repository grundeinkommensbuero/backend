/**
 * Test computeStats function of getPlacesStats endpoint
 */

const uuid = require('uuid/v4');
const crypto = require('crypto-secure-random-digit');
const {
  timePassed,
  computeStats,
} = require('../../../../src/api/places/getPlacesStats');

const populations = [50, 100, 1000, 5000, 10000, 30000, 100000, 2000000];
const users = [
  [0, 1], // "new"
  [1, 4], // –
  [5, 12], // "win"
  [0, 40], // "new"
  [80, 110], // "win"
  [50, 250], // -
  [200, 800], // "change"
  [4000, 7000], // "change"
];

const municipalities = [];

describe('Test computeStats', () => {
  beforeAll(() => {
    // Create test data
    for (let i = 0; i < populations.length; i++) {
      const municipality = {
        ags: crypto.randomDigits(6).join(''),
        population: populations[i],
        users: [],
      };

      for (let j = 0; j < users[i][0]; j++) {
        municipality.users.push({
          id: uuid(),
          createdAt: new Date(
            new Date().getTime() - timePassed - 10000
          ).toISOString(),
        });
      }

      const change = users[i][1] - users[i][0];
      for (let j = 0; j < change; j++) {
        municipality.users.push({
          id: uuid(),
          createdAt: new Date().toISOString(),
        });
      }

      municipalities.push(municipality);
    }
  });

  it('should compute stats', () => {
    const stats = computeStats(municipalities);

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
