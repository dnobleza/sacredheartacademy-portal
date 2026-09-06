import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Search } from 'lucide-react';
import { fetchOutstanding } from '../../services/cashierApi';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

function OutstandingBalances() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);

    return fetchOutstanding({ page: page + 1, limit: rowsPerPage, search })
      .then((data) => {
        setRows(data.students);
        setTotal(data.pagination.total);
        setAcademicYear(data.active_academic_year);
        setError('');
      })
      .catch((requestError) => {
        setError(extractErrorMessage(requestError, 'Could not load outstanding balances.'));
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Outstanding Balances
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4 }}>
        {academicYear
          ? `Students who still owe something for ${academicYear.name}, largest balance first.`
          : 'Balances follow the active school year.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      <TextField
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(0);
        }}
        placeholder="Search students"
        size="small"
        sx={{ mb: 3, minWidth: 260 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={16} />
            </InputAdornment>
          ),
        }}
      />

      <Paper
        elevation={0}
        sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}
      >
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Class</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Charges
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Paid
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Balance
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={26} aria-label="Loading balances" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    Nothing outstanding.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.student_id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {[row.first_name, row.last_name].filter(Boolean).join(' ')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {row.student_number || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {row.grade_level_name
                        ? `${row.grade_level_name}${row.section_name ? ` - ${row.section_name}` : ''}`
                        : '—'}
                    </TableCell>
                    <TableCell align="right">{formatCurrency(row.total_charges)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.total_paid)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 800, color: 'warning.dark' }}>
                      {formatCurrency(row.balance)}
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
    </Box>
  );
}

export default OutstandingBalances;
