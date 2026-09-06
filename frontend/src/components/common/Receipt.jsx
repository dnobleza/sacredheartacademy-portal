import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Printer } from 'lucide-react';
import Logo from './Logo';
import { school } from '../../data/landing';
import {
  formatCurrency,
  formatDateTime,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const fullName = (person) =>
  [person?.first_name, person?.middle_name, person?.last_name].filter(Boolean).join(' ').trim();

function Line({ label, value, bold }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
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
 * The official receipt for one payment, shared by the cashier and the
 * applicant so both hold the same document.
 *
 * Printing is the browser's: an @media print block hides everything except
 * this sheet, which avoids pulling in a PDF library for a page that is only
 * ever printed one at a time.
 */
function Receipt({ open, onClose, receipt }) {
  if (!receipt) {
    return null;
  }

  const { payment, items = [], balance_after: balanceAfter, total_charges: totalCharges } = receipt;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}
    >
      {/* Only the sheet survives printing — no dialog chrome, no sidebar. */}
      <Box
        component="style"
        dangerouslySetInnerHTML={{
          __html: `@media print {
            body * { visibility: hidden !important; }
            #printable-receipt, #printable-receipt * { visibility: visible !important; }
            #printable-receipt {
              position: absolute; left: 0; top: 0; width: 100%;
              box-shadow: none !important; padding: 24px !important;
            }
          }`,
        }}
      />

      <DialogContent id="printable-receipt">
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
          <Logo size={52} alt={`${school.name} seal`} />
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{school.name}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {school.address}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {school.phone}
            </Typography>
          </Box>
        </Stack>

        <Divider />

        <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ my: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Official Receipt
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.25rem' }}>
              {payment.or_number}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {formatDateTime(payment.paid_at)}
          </Typography>
        </Stack>

        <Line label="Received from" value={fullName(payment)} />
        {payment.student_number && <Line label="Student number" value={payment.student_number} />}
        {payment.academic_year_name && <Line label="School year" value={payment.academic_year_name} />}
        <Line
          label="Payment method"
          value={`${PAYMENT_METHOD_LABELS[payment.method] || payment.method}${
            payment.reference_no ? ` · ${payment.reference_no}` : ''
          }`}
        />
        <Line label="Type" value={PAYMENT_TYPE_LABELS[payment.payment_type] || 'Partial'} />

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ fontWeight: 800, mb: 1 }}>This payment covered</Typography>

        {items.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Not itemised.
          </Typography>
        ) : (
          items.map((item) => (
            <Line key={item.fee_id} label={item.fee_name} value={formatCurrency(item.amount)} />
          ))
        )}

        <Box sx={{ borderTop: '1px solid rgba(22,59,56,0.16)', mt: 1.5, pt: 1 }}>
          <Line label="Amount paid" value={formatCurrency(payment.amount)} bold />
        </Box>

        {totalCharges !== null && totalCharges !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Line label="Total charges" value={formatCurrency(totalCharges)} />
          </Box>
        )}

        {balanceAfter !== null && balanceAfter !== undefined && (
          <Line label="Remaining balance" value={formatCurrency(balanceAfter)} bold />
        )}

        {payment.cashier_name && (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2.5 }}>
            Received by {payment.cashier_name}
          </Typography>
        )}

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
          This is a system-generated receipt. Keep it for your records.
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>
          Close
        </Button>
        <Button
          onClick={() => window.print()}
          variant="contained"
          startIcon={<Printer size={16} />}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Receipt;
