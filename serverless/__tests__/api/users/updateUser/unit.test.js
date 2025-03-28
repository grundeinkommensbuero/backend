const {
  computeDebitDate,
} = require('../../../../src/api/users/updateUser/computeDebitDate');

describe('Test computeDebitDate', () => {
  it('should compute correct date', () => {
    const date = new Date('2021-02-17');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(4);
    expect(debitDate.getMonth()).toEqual(2);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-03-04');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(2);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-03-14');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(3);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-03-15');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(3);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-03-28');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(3);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-05-10');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(4);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-05-11 14:45:00');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(4);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-05-11 15:45:00');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(5);
    expect(debitDate.getFullYear()).toEqual(2021);
  });

  it('should compute correct date', () => {
    const date = new Date('2021-05-12');

    const debitDate = computeDebitDate(date);

    expect(debitDate.getDate()).toEqual(15);
    expect(debitDate.getMonth()).toEqual(5);
    expect(debitDate.getFullYear()).toEqual(2021);
  });
});
