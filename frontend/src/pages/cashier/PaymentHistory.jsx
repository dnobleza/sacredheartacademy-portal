import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Search } from 'lucide-react';
import { fetchPayment, fetchPayments } from '../../services/cashierApi';
import Receipt from '../../components/common/Receipt';
import { extractErrorMessage } from '../../services/api';
import {
  formatCurrency,
  formatDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
} from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

/**
 * The receipt log. `title` lets the Receipts screen reuse this table rather
 * than keeping a second copy of the same query and pagination.
 */
function PaymentHistory({ title = 'Payment History', description }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [paymentType, setPaymentType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(() => {
    setLoading(true);

    return fetchPayments({ page: page + 1, limit: rowsPerPage, search, method, paymentType, from, to })
      .then((data) => {
        setRows(data.payments);
        setTotal(data.pagination.total);
        setError('');
      })
      .catch((requestError) => {
        setError(extractErrorMessage(requestError, 'Could not load payments.'));
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, search, method, paymentType, from, to]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        {title}
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4 }}>
        {description || 'Every payment recorded, newest first.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 2, mb: 3 }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="OR number or student"
            size="small"
            sx={{ minWidth: 220 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            value={method}
            onChange={(event) => {
              setMethod(event.target.value);
              setPage(0);
            }}
            label="Method"
            size="small"
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">All methods</MenuItem>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            value={paymentType}
            onChange={(event) => {
              setPaymentType(event.target.value);
              setPage(0);
            }}
            label="Type"
            size="small"
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All types</MenuItem>
            {Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(0);
            }}
            label="From"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(0);
            }}
            label="To"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </Paper>

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
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Receipt
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={26} aria-label="Loading payments" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No payments match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                      {row.or_number}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {[row.first_name, row.last_name].filter(Boolean).join(' ')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {row.student_number || '—'}
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
                    <TableCell>{formatDate(row.paid_at)}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() =>
                          fetchPayment(row.id)
                            .then((data) =>
                              setReceipt({
                                payment: data,
                                items: data.items,
                                balance_after: null,
                                total_charges: null,
                              }),
                            )
                            .catch(() => setError('Could not open that receipt.'))
                        }
                        sx={{ fontWeight: 700 }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(event, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[20, 50, 100]}
        />
      </Paper>

      <Receipt open={Boolean(receipt)} onClose={() => setReceipt(null)} receipt={receipt} />
    </Box>
  );
}

export default PaymentHistory;
