import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowLeft, CheckCircle2, FileText } from 'lucide-react';
import Logo from '../../components/common/Logo';
import GradientButton from '../../components/common/GradientButton';
import DocumentField from '../../components/landing/DocumentField';
import { DOCUMENT_FIELDS } from '../../components/landing/AdmissionWizard';
import {
  declarePaymentForApplication,
  fetchApplicationReceipt,
  fetchApplicationStatus,
  resubmitApplication,
} from '../../services/publicApi';
import Receipt from '../../components/common/Receipt';
import { formatCurrency, PAYMENT_METHOD_LABELS } from '../../utils/format';
import { extractErrorMessage } from '../../services/api';
import { AQUA, CARD_RADIUS, glass } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.12)';

// What each state means to the applicant, in their words rather than ours.
const STATUS_COPY = {
  pending: {
    label: 'Under review',
    tone: 'info',
    detail: 'Your application is in the queue. The registrar reviews applications within three school days.',
  },
  reviewing: {
    label: 'Being reviewed',
    tone: 'info',
    detail: 'The registrar is checking your information and requirements right now.',
  },
  returned: {
    label: 'Needs your attention',
    tone: 'warning',
    detail: 'The registrar needs something corrected before your application can move forward.',
  },
  accepted: {
    label: 'Approved — payment needed',
    tone: 'warning',
    detail:
      'Your application was approved. Report your payment below once you have paid — the cashier '
      + 'checks it and issues your receipt, then the registrar assigns your section. Earlier '
      + 'payments get the earlier sections.',
  },
  enrolled: {
    label: 'Enrolled',
    tone: 'success',
    detail: 'You are enrolled. Your student account details were sent to the school contact on file.',
  },
  rejected: {
    label: 'Not accepted',
    tone: 'error',
    detail: 'This application was not accepted. Contact the registrar if you believe this is a mistake.',
  },
};

const DOCUMENT_LABELS = DOCUMENT_FIELDS.reduce((map, field) => {
  map[field.name] = field.label;
  return map;
}, {});

const FIELD_LABELS = {
  first_name: 'First name',
  middle_name: 'Middle name',
  last_name: 'Last name',
  birth_date: 'Birth date',
  gender: 'Gender',
  address: 'Home address',
  email: 'Email',
  contact_number: 'Mobile number',
  previous_school: 'Previous school',
  guardian_name: 'Parent or guardian name',
  guardian_relationship: 'Relationship',
  guardian_contact_number: 'Parent or guardian mobile',
  guardian_email: 'Parent or guardian email',
  grade_level_id: 'Grade level',
};

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

// grade_level_id cannot be corrected here: it needs the grade list and would
// change what the application even is. The registrar handles that one.
const EDITABLE_FIELDS = Object.keys(FIELD_LABELS).filter(
  (field) => field !== 'grade_level_id' && field !== 'email',
);

function ApplicationStatus() {
  const [lookup, setLookup] = useState({ reference: '', email: '' });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [corrections, setCorrections] = useState({});
  const [replacements, setReplacements] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [resubmitted, setResubmitted] = useState(false);
  const [payment, setPayment] = useState({ amount: '', method: 'gcash', reference_no: '', note: '' });
  const [proof, setProof] = useState(null);
  const [payError, setPayError] = useState('');
  const [paySent, setPaySent] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payPlan, setPayPlan] = useState('downpayment');
  const [receipt, setReceipt] = useState(null);

  const handleLookup = async (event) => {
    event.preventDefault();
    setError('');
    setResubmitted(false);
    setLoading(true);

    try {
      const result = await fetchApplicationStatus({
        reference: lookup.reference.trim(),
        email: lookup.email.trim(),
      });

      setData(result);
      setCorrections({});
      setReplacements({});
      setPaySent(false);
      setPayError('');
      setProof(null);
      setPayment({
        amount: result.payment?.downpayment?.remaining
          ? String(result.payment.downpayment.remaining)
          : String(result.payment?.balance || ''),
        method: 'gcash',
        reference_no: '',
        note: '',
      });
      setPayPlan(result.payment?.downpayment?.remaining ? 'downpayment' : 'full');
    } catch (requestError) {
      setData(null);
      setError(extractErrorMessage(requestError, 'Could not find that application.'));
    } finally {
      setLoading(false);
    }
  };

  // Picking a plan only fills the amount; the applicant can still type their
  // own figure, which switches the toggle to neither.
  const handlePlanChange = (event, next) => {
    if (!next) {
      return;
    }

    setPayPlan(next);

    const info = data?.payment;

    if (!info) {
      return;
    }

    const value = next === 'full' ? info.balance : info.downpayment?.remaining || 0;
    setPayment((current) => ({ ...current, amount: String(value) }));
  };

  const openReceipt = (paymentId) => {
    fetchApplicationReceipt({
      reference: lookup.reference.trim(),
      email: lookup.email.trim(),
      paymentId,
    })
      .then(setReceipt)
      .catch(() => setPayError('Could not open that receipt.'));
  };

  const handleDeclarePayment = async (event) => {
    event.preventDefault();
    setPayError('');
    setPaying(true);

    try {
      await declarePaymentForApplication({
        reference: lookup.reference.trim(),
        email: lookup.email.trim(),
        fields: payment,
        proof,
      });

      setPaySent(true);
      setProof(null);

      // Re-read so the page shows the report exactly as the server stored it.
      const refreshed = await fetchApplicationStatus({
        reference: lookup.reference.trim(),
        email: lookup.email.trim(),
      });

      setData(refreshed);
    } catch (requestError) {
      setPayError(extractErrorMessage(requestError, 'Could not send that payment.'));
    } finally {
      setPaying(false);
    }
  };

  const handleResubmit = async () => {
    setError('');
    setSubmitting(true);

    try {
      await resubmitApplication({
        reference: lookup.reference.trim(),
        email: lookup.email.trim(),
        fields: corrections,
        documents: replacements,
      });

      setResubmitted(true);

      // Re-read rather than patching local state, so the applicant sees
      // exactly what the server now holds.
      const refreshed = await fetchApplicationStatus({
        reference: lookup.reference.trim(),
        email: lookup.email.trim(),
      });

      setData(refreshed);
      setCorrections({});
      setReplacements({});
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not send your corrections.'));
    } finally {
      setSubmitting(false);
    }
  };

  const application = data?.application;
  const paymentInfo = data?.payment;
  const status = application ? STATUS_COPY[application.status] || STATUS_COPY.pending : null;
  const returnItems = data?.return_items || [];
  const documentItems = returnItems.filter((item) => item.item_type === 'document');
  const informationItems = returnItems.filter(
    (item) => item.item_type === 'information' && EDITABLE_FIELDS.includes(item.item_key),
  );
  const lockedItems = returnItems.filter(
    (item) => item.item_type === 'information' && !EDITABLE_FIELDS.includes(item.item_key),
  );

  const nothingToSend =
    Object.keys(corrections).length === 0
    && Object.values(replacements).every((file) => !file);

  return (
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(180deg, ${AQUA.veryLight} 0%, #FFFFFF 40%)` }}>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 4 }}>
          <Logo />
          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowLeft size={16} />}
            sx={{ color: 'primary.dark', fontWeight: 700 }}
          >
            Back to the site
          </Button>
        </Stack>

        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.7rem', md: '2.1rem' } }}>
          Check your application
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 560 }}>
          Enter the reference number from your application together with the email address you used.
        </Typography>

        <Paper elevation={0} sx={{ ...glass, borderRadius: CARD_RADIUS, p: 3, mb: 4 }}>
          <Box component="form" onSubmit={handleLookup} noValidate>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="Reference number"
                  value={lookup.reference}
                  onChange={(event) => setLookup((c) => ({ ...c, reference: event.target.value }))}
                  placeholder="SHA-2026-0001"
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 5 }}>
                <TextField
                  label="Email address"
                  type="email"
                  value={lookup.email}
                  onChange={(event) => setLookup((c) => ({ ...c, email: event.target.value }))}
                  size="small"
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 2 }}>
                <GradientButton type="submit" disabled={loading} fullWidth>
                  {loading ? '…' : 'Check'}
                </GradientButton>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
            {error}
          </Alert>
        )}

        {resubmitted && (
          <Alert severity="success" icon={<CheckCircle2 size={20} />} sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
            Thank you — your corrections are with the registrar.
          </Alert>
        )}

        {application && (
          <Stack spacing={3}>
            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <Box>
                  <Typography variant="h5">{application.reference_number}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {[application.first_name, application.last_name].filter(Boolean).join(' ')} ·{' '}
                    {application.grade_level_name}
                    {application.academic_year_name ? ` · ${application.academic_year_name}` : ''}
                  </Typography>
                </Box>

                <Chip
                  label={status.label}
                  color={status.tone}
                  sx={{ ml: { sm: 'auto' }, fontWeight: 700 }}
                />
              </Stack>

              <Alert severity={status.tone} sx={{ mt: 2, borderRadius: CARD_RADIUS }}>
                {status.detail}
              </Alert>

              {application.review_remarks && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Note from the registrar
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                    {application.review_remarks}
                  </Typography>
                </Box>
              )}

              {application.submission_count > 1 && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                  Submitted {application.submission_count} times.
                </Typography>
              )}
            </Paper>

            <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
              <Typography sx={{ fontWeight: 800, mb: 1.5 }}>Documents on file</Typography>

              <Stack spacing={1}>
                {DOCUMENT_FIELDS.map((field) => {
                  const onFile = (data.documents || []).find(
                    (row) => row.document_type === field.name,
                  );
                  const required = (data.required_documents || []).includes(field.name);

                  return (
                    <Stack key={field.name} direction="row" alignItems="center" spacing={1}>
                      <Box
                        aria-hidden="true"
                        sx={{ color: onFile ? 'primary.dark' : 'text.disabled', display: 'flex' }}
                      >
                        <FileText size={18} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 200 }}>
                        {field.label}
                      </Typography>
                      <Chip
                        size="small"
                        label={onFile ? 'Received' : required ? 'Still needed' : 'Not submitted'}
                        color={onFile ? 'success' : required ? 'warning' : 'default'}
                        sx={{ fontWeight: 700 }}
                      />
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>

            {application.status === 'accepted' && paymentInfo && (
              <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
                <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Payment</Typography>

                {paymentInfo.charges?.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      Your charges
                    </Typography>

                    {paymentInfo.charges.map((charge) => (
                      <Stack
                        key={charge.id}
                        direction="row"
                        justifyContent="space-between"
                        sx={{ py: 0.4 }}
                      >
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {charge.fee_name}
                          {charge.paid > 0 ? ` · ${formatCurrency(charge.paid)} paid` : ''}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatCurrency(charge.amount)}
                        </Typography>
                      </Stack>
                    ))}

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      sx={{ borderTop: CARD_BORDER, mt: 1, pt: 1 }}
                    >
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        Total charges
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {formatCurrency(paymentInfo.total_charges)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Paid so far
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(paymentInfo.total_paid)}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.4 }}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        Balance
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.dark' }}>
                        {formatCurrency(paymentInfo.balance)}
                      </Typography>
                    </Stack>
                  </Box>
                )}

                {paymentInfo.downpayment?.required > 0 ? (
                  <Alert severity="info" sx={{ mb: 2, borderRadius: CARD_RADIUS }}>
                    Downpayment is{' '}
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {paymentInfo.downpayment.percentage}% of{' '}
                      {formatCurrency(paymentInfo.downpayment.total_charges)}
                    </Box>{' '}
                    = {formatCurrency(paymentInfo.downpayment.required)} ·{' '}
                    {formatCurrency(paymentInfo.downpayment.paid)} paid ·{' '}
                    {formatCurrency(paymentInfo.downpayment.remaining)} remaining
                  </Alert>
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    No downpayment is required for your grade level. Your balance is{' '}
                    {formatCurrency(paymentInfo.balance)}.
                  </Typography>
                )}

                {payError && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: CARD_RADIUS }} onClose={() => setPayError('')}>
                    {payError}
                  </Alert>
                )}

                {paySent && (
                  <Alert severity="success" sx={{ mb: 2, borderRadius: CARD_RADIUS }}>
                    Sent to the cashier. Check back here for your official receipt.
                  </Alert>
                )}

                {paymentInfo.has_pending ? (
                  <Alert severity="info" sx={{ borderRadius: CARD_RADIUS }}>
                    Your payment is waiting for the cashier to confirm. You can send another once
                    they have acted on it.
                  </Alert>
                ) : (
                  <Box component="form" onSubmit={handleDeclarePayment}>
                    {/* Two ways to settle: the whole balance (cash basis) or
                        just the downpayment that unlocks enrollment. Either
                        fills the amount below, which stays editable. */}
                    <ToggleButtonGroup
                      value={payPlan}
                      exclusive
                      onChange={handlePlanChange}
                      size="small"
                      fullWidth
                      sx={{ mb: 2 }}
                    >
                      <ToggleButton value="full" sx={{ fontWeight: 700, textTransform: 'none' }}>
                        Pay in full · {formatCurrency(paymentInfo.balance)}
                      </ToggleButton>
                      <ToggleButton
                        value="downpayment"
                        disabled={!paymentInfo.downpayment?.remaining}
                        sx={{ fontWeight: 700, textTransform: 'none' }}
                      >
                        Downpayment · {formatCurrency(paymentInfo.downpayment?.remaining || 0)}
                      </ToggleButton>
                    </ToggleButtonGroup>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          value={payment.amount}
                          onChange={(event) => setPayment((c) => ({ ...c, amount: event.target.value }))}
                          label="Amount paid"
                          type="number"
                          size="small"
                          fullWidth
                          required
                          inputProps={{ step: '0.01', min: '0' }}
                          InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          select
                          value={payment.method}
                          onChange={(event) => setPayment((c) => ({ ...c, method: event.target.value }))}
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
                          value={payment.reference_no}
                          onChange={(event) => setPayment((c) => ({ ...c, reference_no: event.target.value }))}
                          label="Reference number"
                          size="small"
                          fullWidth
                          helperText="Your GCash or bank reference, if you have one"
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          value={payment.note}
                          onChange={(event) => setPayment((c) => ({ ...c, note: event.target.value }))}
                          label="Note (optional)"
                          size="small"
                          fullWidth
                        />
                      </Grid>

                      <Grid size={12}>
                        <DocumentField
                          name="proof"
                          label="Proof of payment"
                          hint="Optional · a screenshot or photo of the receipt"
                          value={proof}
                          error={undefined}
                          onChange={(name, file) => setProof(file)}
                        />
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
                      <GradientButton type="submit" disabled={paying || !payment.amount} fullWidth={false}>
                        {paying ? 'Sending…' : 'Report payment'}
                      </GradientButton>
                      {paying && <CircularProgress size={22} aria-label="Sending" />}
                    </Stack>
                  </Box>
                )}

                {paymentInfo.declarations.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>
                      Payments you reported
                    </Typography>
                    <Stack spacing={1}>
                      {paymentInfo.declarations.map((row) => (
                        <Stack key={row.id} direction="row" alignItems="center" spacing={1.5}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatCurrency(row.amount)} ·{' '}
                              {PAYMENT_METHOD_LABELS[row.method] || row.method}
                              {row.or_number ? ` · ${row.or_number}` : ''}
                            </Typography>
                            {row.review_remarks && (
                              <Typography variant="caption" sx={{ color: 'error.main' }}>
                                {row.review_remarks}
                              </Typography>
                            )}
                          </Box>
                          <Chip
                            size="small"
                            label={row.status}
                            color={
                              row.status === 'confirmed'
                                ? 'success'
                                : row.status === 'rejected'
                                  ? 'error'
                                  : 'warning'
                            }
                            sx={{ ml: 'auto', textTransform: 'capitalize', fontWeight: 700 }}
                          />

                          {row.status === 'confirmed' && row.payment_id && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openReceipt(row.payment_id)}
                              sx={{ fontWeight: 700, flexShrink: 0 }}
                            >
                              Receipt
                            </Button>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </Paper>
            )}

            {application.status === 'returned' && (
              <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
                <Typography sx={{ fontWeight: 800, mb: 0.5 }}>What needs fixing</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Correct the items below and send them back. Everything else stays as it is.
                </Typography>

                {documentItems.length > 0 && (
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    {documentItems.map((item) => (
                      <Grid key={item.id} size={{ xs: 12, sm: 6 }}>
                        <DocumentField
                          name={item.item_key}
                          label={DOCUMENT_LABELS[item.item_key] || item.item_key}
                          hint={item.note || 'Attach a replacement'}
                          value={replacements[item.item_key] || null}
                          error={undefined}
                          onChange={(name, file) =>
                            setReplacements((current) => ({ ...current, [name]: file }))
                          }
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}

                {informationItems.length > 0 && (
                  <Grid container spacing={2}>
                    {informationItems.map((item) => (
                      <Grid key={item.id} size={{ xs: 12, sm: 6 }}>
                        {item.item_key === 'gender' ? (
                          <TextField
                            select
                            label={FIELD_LABELS[item.item_key]}
                            helperText={item.note || ' '}
                            value={corrections[item.item_key] ?? application[item.item_key] ?? ''}
                            onChange={(event) =>
                              setCorrections((c) => ({ ...c, [item.item_key]: event.target.value }))
                            }
                            size="small"
                            fullWidth
                          >
                            {GENDER_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        ) : (
                          <TextField
                            label={FIELD_LABELS[item.item_key]}
                            type={item.item_key === 'birth_date' ? 'date' : 'text'}
                            slotProps={
                              item.item_key === 'birth_date'
                                ? { inputLabel: { shrink: true } }
                                : undefined
                            }
                            helperText={item.note || ' '}
                            value={
                              corrections[item.item_key]
                              ?? String(application[item.item_key] ?? '').slice(
                                0,
                                item.item_key === 'birth_date' ? 10 : undefined,
                              )
                            }
                            onChange={(event) =>
                              setCorrections((c) => ({ ...c, [item.item_key]: event.target.value }))
                            }
                            size="small"
                            fullWidth
                          />
                        )}
                      </Grid>
                    ))}
                  </Grid>
                )}

                {lockedItems.length > 0 && (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: CARD_RADIUS }}>
                    The registrar also flagged{' '}
                    {lockedItems.map((item) => FIELD_LABELS[item.item_key] || item.item_key).join(', ')}
                    . Please contact the school office about that — it cannot be changed here.
                  </Alert>
                )}

                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
                  <GradientButton
                    onClick={handleResubmit}
                    disabled={submitting || nothingToSend}
                    fullWidth={false}
                  >
                    {submitting ? 'Sending…' : 'Resubmit application'}
                  </GradientButton>
                  {submitting && <CircularProgress size={22} aria-label="Sending" />}
                </Stack>
              </Paper>
            )}
          </Stack>
        )}
        <Receipt open={Boolean(receipt)} onClose={() => setReceipt(null)} receipt={receipt} />
      </Container>
    </Box>
  );
}

export default ApplicationStatus;
