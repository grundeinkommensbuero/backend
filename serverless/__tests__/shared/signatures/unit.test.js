const { getComputedCountForList } = require('../../../src/shared/signatures');

describe('get signature count for one list tests', () => {
  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: false, timestamp: '2020-03-14' },
      { count: 15, isReceived: true, timestamp: '2020-03-15' },
      { count: 25, isReceived: true, timestamp: '2020-03-16' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(40);
  });

  it('should sort correctly and get correct signature count', async () => {
    const scans = [
      { count: 15, isReceived: true, timestamp: '2020-03-15' },
      { count: 20, isReceived: false, timestamp: '2020-03-14' },
      { count: 25, isReceived: true, timestamp: '2020-03-16' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(40);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: false, timestamp: '2020-03-14' },
      { count: 15, isReceived: true, timestamp: '2020-03-15' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(20);
  });

  it('should get correct signature count', async () => {
    const scans = [{ count: 20, isReceived: false, timestamp: '2020-03-14' }];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(20);
  });

  it('should get correct signature count', async () => {
    const scans = [{ count: 20, isReceived: true, timestamp: '2020-03-14' }];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(20);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 30, isReceived: true, timestamp: '2020-03-15' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(50);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(70);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 15, isReceived: true, timestamp: '2020-03-17' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(70);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 15, isReceived: true, timestamp: '2020-03-17' },
      { count: 50, isReceived: true, timestamp: '2020-03-17' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(85);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 15, isReceived: true, timestamp: '2020-03-17' },
      { count: 50, isReceived: true, timestamp: '2020-03-17' },
      { count: 30, isReceived: false, timestamp: '2020-03-18' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(115);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 15, isReceived: true, timestamp: '2020-03-17' },
      { count: 10, isReceived: false, timestamp: '2020-03-18' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(80);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 15, isReceived: true, timestamp: '2020-03-17' },
      { count: 10, isReceived: false, timestamp: '2020-03-18' },
      { count: 50, isReceived: true, timestamp: '2020-03-19' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(85);
  });

  it('should get correct signature count', async () => {
    const scans = [
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 15, isReceived: true, timestamp: '2020-03-17' },
      { count: 10, isReceived: false, timestamp: '2020-03-18' },
      { count: 20, isReceived: true, timestamp: '2020-03-19' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(80);
  });

  it('should sort correctly get correct signature count', async () => {
    const scans = [
      { count: 30, isReceived: false, timestamp: '2020-03-15' },
      { count: 15, isReceived: true, timestamp: '2020-03-17' },
      { count: 20, isReceived: false, timestamp: '2020-03-16' },
      { count: 30, isReceived: false, timestamp: '2020-03-18' },
      { count: 20, isReceived: true, timestamp: '2020-03-14' },
      { count: 50, isReceived: true, timestamp: '2020-03-17' },
    ];

    const signatureCount = getComputedCountForList(scans);

    expect(signatureCount).toEqual(115);
  });
});
