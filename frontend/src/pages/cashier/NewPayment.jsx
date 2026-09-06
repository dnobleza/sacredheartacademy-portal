import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { CheckCircle2, Search } from 'lucide-react';
import {
  createPayment,
  fetchCurrentSession,
  fetchStudentAccount,
  searchStudents,
} from '../../services/cashierApi';
import { extractErrorMessage } from '../../services/api';
import StudentAccountPanel, { fullName } from '../../components/cashier/StudentAccountPanel';
import { formatCurrency, PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';
const METHODS = ['cash', 'gcash', 'bank_transfer', 'card', 'other'];

const round = (value) => Math.round(value * 100) / 100;

function NewPayment() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [account, setAccount] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [session, setSession] = useState(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [paymentType, setPaymentType] = useState('partial');
  const [referenceNo, setReferenceNo] = useState('');
  const [allocations, setAllocations] = useState({});
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    fetchCurrentSession()
      .then((data) => setSession(data.session))
      .catch(() => setSession(null));
  }, []);

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');

    if (query.trim().length < 2) {
      setError('Type at least two characters to search.');
      return;
    }

    setSearching(true);

    try {
      const data = await searchStudents(query.trim());
      setResults(data.students);
      setAcademicYear(data.active_academic_year);

      // One hit is the common case — a cashier typing a student number.
      if (data.students.length === 1) {
        await pickStudent(data.students[0].student_id);
      }
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not search for that student.'));
    } finally {
      setSearching(false);
    }
  };

  const pickStudent = async (studentId) => {
    setError('');

    try {
      const data = await fetchStudentAccount(studentId);
      setAccount(data);
      setAcademicYear(data.academic_year);
      setResults(null);
      setAllocations({});
      setAmount('');
      setPaymentType('partial');
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not load that account.'));
    }
  };

  const unpaidCharges = useMemo(
    () => (account?.charges || []).filter((charge) => charge.balance > 0),
    [account],
  );

  const allocatedTotal = useMemo(
    () => round(Object.values(allocations).reduce((total, value) => total + (Number(value) || 0), 0)),
    [allocations],
  );

  const amountNumber = Number(amount) || 0;
  const allocationMismatch = round(amountNumber) !== allocatedTotal;

  // Spreading the amount over the oldest unpaid fees first is what a cashier
  // does by hand; they can still override any line.
  const autoAllocate = (value) => {
    let remaining = round(Number(value) || 0);
    const next = {};

    unpaidCharges.forEach((charge) => {
      if (remaining <= 0) {
        return;
      }

      const take = Math.min(charge.balance, remaining);
      next[charge.fee_id] = take;
      remaining = round(remaining - take);
    });

    setAllocations(next);
  };

  const handleAmountChange = (event) => {
    setAmount(event.target.value);
    autoAllocate(event.target.value);
  };

  // Full means "settle the balance", so the amount is the balance by
  // definition and the field goes read-only. Switching back to Partial keeps
  // what is already typed rather than wiping it.
  const handleTypeChange = (event, next) => {
    if (!next) {
      return;
    }

    setPaymentType(next);

    if (next === 'full' && account) {
      const balance = account.totals.balance;
      setAmount(String(balance));
      autoAllocate(balance);
    }
  };

  const handleSubmit = async () => {
    setError('');

    if (!account) {
      return;
    }

    setSubmitting(true);

    try {
      const result = await createPayment({
        student_id: account.student.id,
        amount: round(amountNumber),
        payment_type: paymentType,
        method,
        reference_no: referenceNo.trim() || null,
        allocations: Object.entries(allocations)
          .filter(([, value]) => Number(value) > 0)
          .map(([feeId, value]) => ({ fee_id: Number(feeId), amount: round(Number(value)) })),
      });

      setReceipt(result);
      setAccount(null);
      setAmount('');
      setPaymentType('partial');
      setAllocations({});
      setReferenceNo('');
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not record that payment.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <Box>
        <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
          Payment recorded
        </Typography>

        <Paper
          elevation={0}
          sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 4, mt: 3, maxWidth: 520 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
            <Box aria-hidden="true" sx={{ color: 'primary.dark', display: 'flex' }}>
              <CheckCircle2 size={28} />
            </Box>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.4rem' }}>
              {receipt.or_number}
            </Typography>
          </Stack>

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {fullName(receipt.student)}
            {receipt.student?.student_number ? ` · ${receipt.student.student_number}` : ''}
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" justifyContent="space-between">
            <Typography sx={{ fontWeight: 700 }}>Amount paid</Typography>
            <Typography sx={{ fontWeight: 800 }}>{formatCurrency(receipt.amount)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Method
            </Typography>
            <Typography variant="body2">{PAYMENT_METHOD_LABELS[receipt.method]}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Type
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {receipt.payment_type === 'full' ? 'Paid in full' : 'Partial payment'}
            </Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Remaining balance
            </Typography>
            <Typography variant="body2">{formatCurrency(receipt.balance_after)}</Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ mt: 3 }}>
            <Button variant="contained" onClick={() => setReceipt(null)} sx={{ fontWeight: 700 }}>
              New payment
            </Button>
            <Button component={RouterLink} to="/cashier/payments" sx={{ fontWeight: 700 }}>
              Payment history
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        New Payment
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4 }}>
        Search by student number, name or email, then apply the payment against what they owe.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {session === null && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: CARD_RADIUS }}
          action={
            <Button component={RouterLink} to="/cashier/session" size="small" sx={{ fontWeight: 700 }}>
              Open session
            </Button>
          }
        >
          No open cashier session — a payment cannot be recorded until one is open.
        </Alert>
      )}

      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSearch}
        sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 2.5, mb: 3 }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <TextField
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            label="Student number, name or email"
            placeholder="2026-00125"
            size="small"
            fullWidth
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            }}
          />
          <Button type="submit" variant="contained" disabled={searching} sx={{ fontWeight: 700, flexShrink: 0 }}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </Stack>
      </Paper>

      {results && results.length === 0 && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          No student matches that search.
        </Alert>
      )}

      {results && results.length > 0 && (
        <Paper
          elevation={0}
          sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 1, mb: 3 }}
        >
          {results.map((row) => (
            <Stack
              key={row.student_id}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{ p: 1.5, borderRadius: CARD_RADIUS, '&:hover': { backgroundColor: 'primary.light' } }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {[row.first_name, row.last_name].filter(Boolean).join(' ')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {row.student_number || 'No student number'}
                  {row.grade_level_name ? ` · ${row.grade_level_name} ${row.section_name || ''}` : ''}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ ml: 'auto', fontWeight: 700 }}>
                {formatCurrency(row.balance)}
              </Typography>
              <Button size="small" variant="outlined" onClick={() => pickStudent(row.student_id)} sx={{ fontWeight: 700 }}>
                Select
              </Button>
            </Stack>
          ))}
        </Paper>
      )}

      {account && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <StudentAccountPanel account={account} academicYear={academicYear} showPayments={false} />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}
            >
              <Typography sx={{ fontWeight: 800, mb: 2 }}>Record payment</Typography>

              <ToggleButtonGroup
                value={paymentType}
                exclusive
                onChange={handleTypeChange}
                size="small"
                fullWidth
                sx={{ mb: 2 }}
              >
                <ToggleButton value="full" disabled={account.totals.balance <= 0} sx={{ fontWeight: 700 }}>
                  Full payment
                </ToggleButton>
                <ToggleButton value="partial" sx={{ fontWeight: 700 }}>
                  Partial payment
                </ToggleButton>
              </ToggleButtonGroup>

              <TextField
                value={amount}
                onChange={handleAmountChange}
                disabled={paymentType === 'full'}
                label="Payment amount"
                type="number"
                size="small"
                fullWidth
                inputProps={{ step: '0.01', min: '0' }}
                InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                helperText={
                  paymentType === 'full'
                    ? `Settles the whole balance of ${formatCurrency(account.totals.balance)}`
                    : `Outstanding balance ${formatCurrency(account.totals.balance)}`
                }
              />

              <Typography variant="body2" sx={{ fontWeight: 700, mt: 2.5, mb: 1 }}>
                Applied to
              </Typography>

              {unpaidCharges.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Nothing outstanding on this account.
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {unpaidCharges.map((charge) => (
                    <Stack key={charge.fee_id} direction="row" alignItems="center" spacing={1.5}>
                      <Typography variant="body2" sx={{ minWidth: 150, color: 'text.secondary' }}>
                        {charge.fee_name}
                      </Typography>
                      <TextField
                        value={allocations[charge.fee_id] ?? ''}
                        onChange={(event) =>
                          setAllocations((current) => ({ ...current, [charge.fee_id]: event.target.value }))
                        }
                        size="small"
                        type="number"
                        inputProps={{ step: '0.01', min: '0', max: charge.balance }}
                        placeholder="0.00"
                        sx={{ width: 130 }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        of {formatCurrency(charge.balance)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}

              {amountNumber > 0 && allocationMismatch && (
                <Alert severity="warning" sx={{ mt: 2, borderRadius: CARD_RADIUS }}>
                  Applied {formatCurrency(allocatedTotal)} of {formatCurrency(amountNumber)} — they must match.
                </Alert>
              )}

              <Typography variant="body2" sx={{ fontWeight: 700, mt: 2.5, mb: 0.5 }}>
                Payment method
              </Typography>
              <RadioGroup value={method} onChange={(event) => setMethod(event.target.value)}>
                {METHODS.map((value) => (
                  <FormControlLabel
                    key={value}
                    value={value}
                    control={<Radio size="small" />}
                    label={PAYMENT_METHOD_LABELS[value]}
                  />
                ))}
              </RadioGroup>

              {method !== 'cash' && (
                <TextField
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                  label="Reference number"
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                />
              )}

              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={
                  submitting
                  || !session
                  || amountNumber <= 0
                  || allocationMismatch
                  || amountNumber > account.totals.balance
                }
                sx={{ mt: 3, fontWeight: 700 }}
              >
                {submitting ? 'Processing…' : 'Process Payment'}
              </Button>
              {submitting && <CircularProgress size={20} sx={{ ml: 2 }} aria-label="Processing" />}
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default NewPayment;
