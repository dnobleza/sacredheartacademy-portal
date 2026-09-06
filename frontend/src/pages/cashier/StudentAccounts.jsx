import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Search } from 'lucide-react';
import { fetchStudentAccount, searchStudents } from '../../services/cashierApi';
import { extractErrorMessage } from '../../services/api';
import StudentAccountPanel from '../../components/cashier/StudentAccountPanel';
import { formatCurrency } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

function StudentAccounts() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [account, setAccount] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (event) => {
    event.preventDefault();
    setError('');

    if (query.trim().length < 2) {
      setError('Type at least two characters to search.');
      return;
    }

    setLoading(true);

    try {
      const data = await searchStudents(query.trim());
      setResults(data.students);
      setAcademicYear(data.active_academic_year);
      setAccount(null);
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not search for that student.'));
    } finally {
      setLoading(false);
    }
  };

  const openAccount = async (studentId) => {
    setError('');

    try {
      const data = await fetchStudentAccount(studentId);
      setAccount(data);
      setAcademicYear(data.academic_year);
      setResults(null);
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not load that account.'));
    }
  };

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Student Accounts
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4 }}>
        Look up a student to see their charges, payments and balance for the school year.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }} onClose={() => setError('')}>
          {error}
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
          <Button type="submit" variant="contained" disabled={loading} sx={{ fontWeight: 700, flexShrink: 0 }}>
            {loading ? 'Searching…' : 'Search'}
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
              <Button size="small" variant="outlined" onClick={() => openAccount(row.student_id)} sx={{ fontWeight: 700 }}>
                View
              </Button>
            </Stack>
          ))}
        </Paper>
      )}

      {account && <StudentAccountPanel account={account} academicYear={academicYear} />}
    </Box>
  );
}

export default StudentAccounts;
