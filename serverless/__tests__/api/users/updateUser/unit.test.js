const { computeDebitDate } = require('../../../../src/api/users/updateUser');

describe('Test computeDebitDate', () => {
  it('should compute correct date', () => {
    const date = new Date('2020-12-08');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(9);
    expect(debitDate.getMonth()).toEqual(11);
    expect(debitDate.getFullYear()).toEqual(2020);
  });

  it('should compute correct date', () => {
    const date = new Date('2020-12-09');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(13);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2020-12-17');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(13);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2020-12-16');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(13);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-02-01');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(10);
    expect(debitDate.getMonth()).toEqual(1);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-02-11');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(10);
    expect(debitDate.getMonth()).toEqual(2);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-02-10');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(10);
    expect(debitDate.getMonth()).toEqual(2);
    expect(debitDate.getFullYear()).toEqual(2021);
  });
});
