const { computeDebitDate } = require('../../../../src/api/users/updateUser');

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
    expect(debitDate.getMonth()).toEqual(2);
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
});
