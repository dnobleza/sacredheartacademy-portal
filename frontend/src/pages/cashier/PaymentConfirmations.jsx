import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { FileText } from 'lucide-react';
import {
  confirmDeclaration,
  fetchDeclarations,
  rejectDeclaration,
} from '../../services/declarationsApi';
import { fetchImageObjectUrl } from '../../services/imagesApi';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const STATUS_FILTERS = [
  { value: 'pending', label: 'Waiting' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

const STATUS_COLORS = { pending: 'warning', confirmed: 'success', rejected: 'error' };

const fullName = (row) => [row.first_name, row.last_name].filter(Boolean).join(' ').trim();

function PaymentConfirmations() {
  const [declarations, setDeclarations] = useState([]);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [confirming, setConfirming] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [remarks, setRemarks] = useState('');

  const load = useCallback(() => {
    setLoading(true);

    return fetchDeclarations(status)
      .then((data) => {
        setDeclarations(data.declarations);
        setError('');
      })
      .catch((requestError) => {
        setError(extractErrorMessage(requestError, 'Could not load payment confirmations.'));
      })
      .finally(() => setLoading(false));
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // Proof images sit behind the authenticated /images endpoint, so they cannot
  // be used as a plain href.
  const openProof = (imageId) => {
    fetchImageObjectUrl(imageId)
      .then((url) => {
        window.open(url, '_blank', 'noopener');
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      })
      .catch(() => setToast('Could not open that proof image.'));
  };

  const handleConfirm = async () => {
    const declaration = confirming;
    setConfirming(null);
    setBusy(true);

    try {
      const result = await confirmDeclaration(declaration.id);
      setToast(`Recorded as ${result.or_number}.`);
      await load();
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not confirm that payment.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    const declaration = rejecting;
    setRejecting(null);
    setBusy(true);

    try {
      await rejectDeclaration(declaration.id, { review_remarks: remarks.trim() });
      setToast('Sent back to the student.');
      setRemarks('');
      await load();
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not reject that payment.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Payment Confirmations
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 640 }}>
        Payments students say they have made. Confirming one issues the official receipt and
        updates their balance; nothing is recorded until you do.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TextField
        select
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        label="Show"
        size="small"
        sx={{ mb: 3, minWidth: 180 }}
      >
        {STATUS_FILTERS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress size={26} aria-label="Loading confirmations" />
        </Box>
      ) : declarations.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', py: 6, textAlign: 'center' }}
        >
          <Typography sx={{ color: 'text.secondary' }}>Nothing waiting.</Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {declarations.map((row) => (
            <Paper
              key={row.id}
              elevation={0}
              sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 2.5 }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography sx={{ fontWeight: 700 }}>{fullName(row)}</Typography>
                    <Chip
                      size="small"
                      label={row.status}
                      color={STATUS_COLORS[row.status] || 'default'}
                      sx={{ textTransform: 'capitalize', fontWeight: 700 }}
                    />
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {row.student_number || 'No student number'} · {formatDateTime(row.created_at)}
                    {row.reference_no ? ` · ref ${row.reference_no}` : ''}
                    {row.or_number ? ` · ${row.or_number}` : ''}
                  </Typography>
                  {row.note && (
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                      {row.note}
                    </Typography>
                  )}
                  {row.review_remarks && (
                    <Typography variant="body2" sx={{ color: 'error.main', mt: 0.5 }}>
                      {row.review_remarks}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ ml: { md: 'auto' }, textAlign: { md: 'right' } }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.15rem' }}>
                    {formatCurrency(row.amount)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {PAYMENT_METHOD_LABELS[row.method] || row.method}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                  {row.proof_image_id && (
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FileText size={16} />}
                      onClick={() => openProof(row.proof_image_id)}
                      sx={{ fontWeight: 700 }}
                    >
                      Proof
                    </Button>
                  )}

                  {row.status === 'pending' && (
                    <>
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy}
                        onClick={() => setConfirming(row)}
                        sx={{ fontWeight: 700 }}
                      >
                        Confirm
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={busy}
                        onClick={() => {
                          setRemarks('');
                          setRejecting(row);
                        }}
                        sx={{ fontWeight: 700 }}
                      >
                        Reject
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={Boolean(confirming)} onClose={() => setConfirming(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirm this payment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirming
              ? `${formatCurrency(confirming.amount)} from ${fullName(confirming)} will be recorded as a real payment with an official receipt, and applied to their oldest unpaid fees.`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Confirm and issue receipt
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject this payment?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            The student sees this reason, so say what was wrong — no matching transfer, wrong
            reference, and so on.
          </DialogContentText>
          <TextField
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            label="Reason"
            size="small"
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleReject}
            disabled={!remarks.trim()}
            color="error"
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={4000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}

export default PaymentConfirmations;
