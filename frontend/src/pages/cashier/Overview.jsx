import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { AlertTriangle, Banknote, CalendarRange, ReceiptText, Search, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCashierDashboard } from '../../services/cashierApi';
import { extractErrorMessage } from '../../services/api';
import {
  formatCurrency,
  formatDateTime,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '../../utils/format';
import { AQUA_GRADIENT, CARD_RADIUS, TILE_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const greeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  return hour < 18 ? 'Good afternoon' : 'Good evening';
};

const CARDS = [
  { key: 'today_collection', label: "Today's Collection", Icon: Banknote, money: true },
  { key: 'month_collection', label: "This Month's Collection", Icon: CalendarRange, money: true },
  { key: 'outstanding_balance', label: 'Outstanding Balance', Icon: AlertTriangle, money: true },
  { key: 'transactions_today', label: 'Transactions Today', Icon: ReceiptText, money: false },
];

function StatCard({ label, value, Icon, loading, money }) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3, height: '100%' }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          aria-hidden="true"
          sx={{
            width: 48,
            height: 48,
            borderRadius: TILE_RADIUS,
            background: AQUA_GRADIENT,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={23} strokeWidth={2} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {label}
          </Typography>

          {loading ? (
            <CircularProgress size={20} sx={{ mt: 1 }} aria-label={`Loading ${label}`} />
          ) : (
            <Typography
              sx={{ fontWeight: 800, fontSize: money ? '1.6rem' : '2rem', lineHeight: 1.2, color: 'primary.main' }}
            >
              {money ? formatCurrency(value) : (value ?? '—')}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function CashierOverview() {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchCashierDashboard()
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load the dashboard.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = dashboard === null && !error;
  const counts = dashboard?.counts || null;
  const transactions = dashboard?.today_transactions || [];
  const summary = dashboard?.collection_summary || [];
  const summaryTotal = summary.reduce((total, row) => total + Number(row.total), 0);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Cashier Dashboard
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4 }}>
        {greeting()}
        {profile?.first_name ? `, ${profile.first_name}` : ', Cashier'}.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {/* A payment cannot be recorded without an open session, so say so up
          front rather than letting the cashier hit the error on submit. */}
      {dashboard && !dashboard.open_session && (
        <Alert
          severity="warning"
          sx={{ mb: 3, borderRadius: CARD_RADIUS }}
          action={
            <Button component={RouterLink} to="/cashier/session" size="small" sx={{ fontWeight: 700 }}>
              Open session
            </Button>
          }
        >
          You have no open cashier session. Open one before recording payments.
        </Alert>
      )}

      <Grid container spacing={3}>
        {CARDS.map(({ key, label, Icon, money }) => (
          <Grid key={key} size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard label={label} value={counts?.[key]} Icon={Icon} loading={loading} money={money} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Quick Actions
        </Typography>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Button
            component={RouterLink}
            to="/cashier/payments/new"
            variant="contained"
            startIcon={<Banknote size={17} />}
            sx={{ fontWeight: 700 }}
          >
            New Payment
          </Button>
          <Button
            component={RouterLink}
            to="/cashier/students"
            variant="outlined"
            startIcon={<Search size={17} />}
            sx={{ fontWeight: 700 }}
          >
            Search Student
          </Button>
          <Button
            component={RouterLink}
            to="/cashier/payments"
            variant="outlined"
            startIcon={<ReceiptText size={17} />}
            sx={{ fontWeight: 700 }}
          >
            Payment History
          </Button>
          <Button
            component={RouterLink}
            to="/cashier/session"
            variant="outlined"
            startIcon={<Wallet size={17} />}
            sx={{ fontWeight: 700 }}
          >
            Cashier Session
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Today&apos;s Transactions
          </Typography>

          <Paper
            elevation={0}
            sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>OR Number</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                        <CircularProgress size={24} aria-label="Loading transactions" />
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                        No payments recorded today.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                          {row.or_number}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {[row.first_name, row.last_name].filter(Boolean).join(' ')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {row.student_number || formatDateTime(row.paid_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatCurrency(row.amount)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={PAYMENT_METHOD_LABELS[row.method] || row.method}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={PAYMENT_TYPE_LABELS[row.payment_type] || 'Partial'}
                            color={row.payment_type === 'full' ? 'success' : 'warning'}
                            sx={{ fontWeight: 700 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Collection Summary
          </Typography>

          <Paper
            elevation={0}
            sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 2.5 }}
          >
            {loading ? (
              <Box sx={{ display: 'grid', placeItems: 'center', py: 4 }}>
                <CircularProgress size={24} aria-label="Loading summary" />
              </Box>
            ) : summary.length === 0 ? (
              <Typography variant="body2" sx={{ color: 'text.secondary', py: 2 }}>
                Nothing collected today.
              </Typography>
            ) : (
              <>
                <Stack spacing={1.25}>
                  {summary.map((row) => (
                    <Stack key={row.fee_id} direction="row" justifyContent="space-between">
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {row.fee_name}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(row.total)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>

                <Box sx={{ borderTop: CARD_BORDER, mt: 2, pt: 1.5 }}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography sx={{ fontWeight: 800 }}>Total</Typography>
                    <Typography sx={{ fontWeight: 800, color: 'primary.dark' }}>
                      {formatCurrency(summaryTotal)}
                    </Typography>
                  </Stack>
                </Box>
              </>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default CashierOverview;
