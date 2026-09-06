/**
 * Money and date formatting, in one place. Before this, `formatDate` was
 * copy-pasted into five components and there was no currency helper at all.
 */

const PESO = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? PESO.format(number) : '—';
};

export const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  // Plain YYYY-MM-DD values would render a day early west of Greenwich if
  // parsed as UTC midnight, so build those in local time.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// What the cashier chose at the counter: a full payment settled the balance,
// a partial one did not.
export const PAYMENT_TYPE_LABELS = {
  full: 'Paid',
  partial: 'Partial',
};

export const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  gcash: 'GCash',
  bank_transfer: 'Bank Transfer',
  card: 'Debit/Credit Card',
  other: 'Other',
};


/**
 * A `HH:MM:SS` time from MySQL, shown the way a schedule reads.
 */
export const formatTime = (value) => {
  if (!value) {
    return '';
  }

  const [hours, minutes] = String(value).split(':');
  const hour = Number(hours);

  if (!Number.isFinite(hour)) {
    return String(value);
  }

  const suffix = hour < 12 ? 'AM' : 'PM';
  const display = hour % 12 === 0 ? 12 : hour % 12;

  return `${String(display).padStart(2, '0')}:${minutes} ${suffix}`;
};


export const greeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  return hour < 18 ? 'Good afternoon' : 'Good evening';
};
