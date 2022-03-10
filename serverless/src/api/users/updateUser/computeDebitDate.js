// Computes the next debit date (15th of each months)
// Exceptions in 2021: 03/04
const computeDebitDate = now => {
  const date = new Date(now);

  // If before the 4th of march we set the debit date to 4th
  if (date < new Date('2021-03-04')) {
    date.setMonth(2);
    date.setDate(4);
  } else {
    // If it is already passed the 11th at 3 pm we set it to next month
    if (now.getDate() > 11 || (now.getDate() === 11 && now.getHours() > 14)) {
      date.setMonth(now.getMonth() + 1);
    }

    // Set to 15th
    date.setDate(15);
  }

  return date;
};

module.exports.computeDebitDate = computeDebitDate;
