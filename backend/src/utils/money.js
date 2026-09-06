const MAX_AMOUNT = 9999999.99;




const toAmount = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.round(number * 100) / 100;
};




const isValidAmount = (value, { allowZero = false } = {}) => {
  const amount = toAmount(value);

  if (amount === null) {
    return false;
  }

  if (amount > MAX_AMOUNT) {
    return false;
  }

  return allowZero ? amount >= 0 : amount > 0;
};




const sumAmounts = (values) =>
  Math.round(values.reduce((total, value) => total + (toAmount(value) || 0), 0) * 100) / 100;

module.exports = {
  MAX_AMOUNT,
  toAmount,
  isValidAmount,
  sumAmounts,
};
