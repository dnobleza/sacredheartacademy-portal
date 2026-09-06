const GRADING_PERIODS = ['1st', '2nd', '3rd', '4th'];

const toDate = (value) => {
  if (value instanceof Date) {
    return value;
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));

  return dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);
};




const currentGradingPeriod = (academicYear) => {
  if (!academicYear || !academicYear.start_date || !academicYear.end_date) {
    return GRADING_PERIODS[0];
  }

  const start = toDate(academicYear.start_date).getTime();
  const end = toDate(academicYear.end_date).getTime();
  const now = Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return GRADING_PERIODS[0];
  }

  const span = (end - start) / GRADING_PERIODS.length;
  const index = Math.floor((now - start) / span);

  return GRADING_PERIODS[Math.min(Math.max(index, 0), GRADING_PERIODS.length - 1)];
};

module.exports = {
  GRADING_PERIODS,
  currentGradingPeriod,
};
