const { computeDebitDate } = require('../../../../src/api/users/updateUser');

describe('Test computeDebitDate', () => {
  it('should compute correct date', () => {
    const date = new Date('2020-12-08');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(22);
    expect(debitDate.getMonth()).toEqual(11);
    expect(debitDate.getFullYear()).toEqual(2020);
  });

  it('should compute correct date', () => {
    const date = new Date('2020-12-09');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(22);
    expect(debitDate.getMonth()).toEqual(11);
    expect(debitDate.getFullYear()).toEqual(2020);
  });

  it('should compute correct date', () => {
    const date = new Date('2020-12-17');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(22);
    expect(debitDate.getMonth()).toEqual(11);
    expect(debitDate.getFullYear()).toEqual(2020);
  });

  it('should compute correct date', () => {
    const date = new Date('2020-12-22');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2020-12-24');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-01-01');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-01-15');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(25);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-01-17');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(25);
    expect(debitDate.getMonth()).toEqual(0);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-01-25');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(1);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-02-01');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(1);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-02-15');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(2);
    expect(debitDate.getFullYear()).toEqual(2021);
  });
});
