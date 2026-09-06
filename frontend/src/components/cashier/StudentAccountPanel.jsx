import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  formatCurrency,
  formatDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

export const fullName = (person) =>
  [person?.first_name, person?.middle_name, person?.last_name].filter(Boolean).join(' ').trim();

function Row({ label, value, bold }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
      <Typography variant="body2" sx={{ color: bold ? 'text.primary' : 'text.secondary', fontWeight: bold ? 800 : 400 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * One student's financial account. Shared by the cashier, the student and the
 * parent so all three read exactly the same figures.
 */
function StudentAccountPanel({ account, academicYear, showPayments = true }) {
  if (!account) {
    return null;
  }

  const { student, charges, payments, totals } = account;

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          <Box>
            <Typography variant="h5">{fullName(student)}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {student.student_number ? `Student No: ${student.student_number}` : student.email}
              {student.grade_level_name
                ? ` · ${student.grade_level_name}${student.section_name ? ` - ${student.section_name}` : ''}`
                : ''}
              {academicYear ? ` · ${academicYear.name}` : ''}
            </Typography>
          </Box>

          <Chip
            label={totals.balance > 0 ? `Balance ${formatCurrency(totals.balance)}` : 'Fully paid'}
            color={totals.balance > 0 ? 'warning' : 'success'}
            sx={{ ml: { sm: 'auto' }, fontWeight: 700 }}
          />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Charges</Typography>

        {charges.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No charges for this school year yet. They are applied when the student is enrolled.
          </Typography>
        ) : (
          <>
            {charges.map((charge) => (
              <Row
                key={charge.id}
                label={charge.fee_name}
                value={
                  charge.paid > 0
                    ? `${formatCurrency(charge.amount)} · ${formatCurrency(charge.balance)} left`
                    : formatCurrency(charge.amount)
                }
              />
            ))}
            <Box sx={{ borderTop: CARD_BORDER, mt: 1.5, pt: 1 }}>
              <Row label="Total Charges" value={formatCurrency(totals.total_charges)} bold />
            </Box>
          </>
        )}
      </Paper>

      {showPayments && (
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
          <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Payments</Typography>

          {payments.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No payments recorded yet.
            </Typography>
          ) : (
            <>
              {payments.map((payment) => (
                <Row
                  key={payment.id}
                  label={`${formatDate(payment.paid_at)} · ${payment.or_number} · ${
                    PAYMENT_METHOD_LABELS[payment.method] || payment.method
                  } · ${PAYMENT_TYPE_LABELS[payment.payment_type] || 'Partial'}`}
                  value={formatCurrency(payment.amount)}
                />
              ))}
              <Box sx={{ borderTop: CARD_BORDER, mt: 1.5, pt: 1 }}>
                <Row label="Total Paid" value={formatCurrency(totals.total_paid)} bold />
                <Row label="Balance" value={formatCurrency(totals.balance)} bold />
              </Box>
            </>
          )}
        </Paper>
      )}
    </Stack>
  );
}

export default StudentAccountPanel;
