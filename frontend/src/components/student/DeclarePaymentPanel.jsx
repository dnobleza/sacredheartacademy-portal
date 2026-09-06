import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ImageField from '../admin/ImageField';
import { declarePayment, fetchMyDeclarations } from '../../services/declarationsApi';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const STATUS_COLORS = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'error',
};

const STATUS_LABELS = {
  pending: 'Waiting for the cashier',
  confirmed: 'Confirmed',
  rejected: 'Not confirmed',
};

/**
 * Lets a student say "I have paid" for a transfer the cashier has not yet
 * seen. Nothing here moves money — the cashier confirms it, and only then is a
 * receipt issued.
 */
function DeclarePaymentPanel({ balance, onConfirmed }) {
  const [declarations, setDeclarations] = useState([]);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('gcash');
  const [referenceNo, setReferenceNo] = useState('');
  const [note, setNote] = useState('');
  const [proofImageId, setProofImageId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    setLoading(true);

    return fetchMyDeclarations()
      .then((data) => setDeclarations(data.declarations))
      .catch(() => setDeclarations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasPending = declarations.some((row) => row.status === 'pending');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await declarePayment({
        amount: Number(amount),
        method,
        reference_no: referenceNo.trim() || null,
        note: note.trim() || null,
        proof_image_id: proofImageId,
      });

      setSuccess('Sent to the cashier. You will be notified once it is confirmed.');
      setAmount('');
      setReferenceNo('');
      setNote('');
      setProofImageId(null);
      await load();
      onConfirmed?.();
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not send that payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
        <Typography sx={{ fontWeight: 800, mb: 0.5 }}>I have paid</Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Paid by GCash, bank transfer or at the counter? Tell the cashier here. They will confirm
          it and your official receipt will appear on this page.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: CARD_RADIUS }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: CARD_RADIUS }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {hasPending ? (
          <Alert severity="info" sx={{ borderRadius: CARD_RADIUS }}>
            You already have a payment waiting to be confirmed. Once the cashier acts on it you can
            send another.
          </Alert>
        ) : (
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  label="Amount paid"
                  type="number"
                  size="small"
                  fullWidth
                  required
                  inputProps={{ step: '0.01', min: '0' }}
                  InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                  helperText={`Outstanding balance ${formatCurrency(balance)}`}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  select
                  value={method}
                  onChange={(event) => setMethod(event.target.value)}
                  label="How did you pay?"
                  size="small"
                  fullWidth
                >
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                  label="Reference number"
                  size="small"
                  fullWidth
                  helperText="The GCash or bank reference, if you have one"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  label="Note (optional)"
                  size="small"
                  fullWidth
                />
              </Grid>

              <Grid size={12}>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                  Proof of payment (optional)
                </Typography>
                <ImageField value={proofImageId} onChange={setProofImageId} label="Proof of payment" />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting || !amount || Number(amount) <= 0}
                sx={{ fontWeight: 700 }}
              >
                {submitting ? 'Sending…' : 'Send to cashier'}
              </Button>
              {submitting && <CircularProgress size={20} aria-label="Sending" />}
            </Stack>
          </Box>
        )}
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
        <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Payments you reported</Typography>

        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
            <CircularProgress size={22} aria-label="Loading" />
          </Box>
        ) : declarations.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Nothing reported yet.
          </Typography>
        ) : (
          <Stack spacing={1.25}>
            {declarations.map((row) => (
              <Stack key={row.id} direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatCurrency(row.amount)} · {PAYMENT_METHOD_LABELS[row.method] || row.method}
                    {row.or_number ? ` · ${row.or_number}` : ''}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {formatDate(row.created_at)}
                    {row.review_remarks ? ` · ${row.review_remarks}` : ''}
                  </Typography>
                </Box>

                <Chip
                  size="small"
                  label={STATUS_LABELS[row.status] || row.status}
                  color={STATUS_COLORS[row.status] || 'default'}
                  sx={{ ml: 'auto', fontWeight: 700, flexShrink: 0 }}
                />
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>
    </Stack>
  );
}

export default DeclarePaymentPanel;
