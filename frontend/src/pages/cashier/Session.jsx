import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { closeSession, fetchCurrentSession, fetchSessions, openSession } from '../../services/cashierApi';
import { extractErrorMessage } from '../../services/api';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

function Line({ label, value, bold }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.6 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: bold ? 700 : 400 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: bold ? 800 : 600 }}>
        {value}
      </Typography>
    </Stack>
  );
}

function Session() {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [closed, setClosed] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [current, past] = await Promise.all([fetchCurrentSession(), fetchSessions()]);
      setSession(current.session);
      setHistory(past.sessions);
      setError('');
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not load your session.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleOpen = async () => {
    setBusy(true);
    setError('');

    try {
      await openSession({ opening_cash: Number(openingCash) || 0 });
      setOpeningCash('');
      setClosed(null);
      await load();
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not open the session.'));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    setBusy(true);
    setError('');

    try {
      const result = await closeSession({ closing_cash: Number(closingCash) || 0, notes: notes.trim() || null });
      setClosed(result);
      setClosingCash('');
      setNotes('');
      await load();
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'Could not close the session.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Cashier Session
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        Payments attach to the session that is open when they are recorded, so the drawer can be
        counted and reconciled at the end of the shift.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {closed && (
        <Alert
          severity={closed.variance === 0 ? 'success' : 'warning'}
          sx={{ mb: 3, borderRadius: CARD_RADIUS }}
          onClose={() => setClosed(null)}
        >
          Session closed. Expected {formatCurrency(closed.expected_cash)}, counted{' '}
          {formatCurrency(closed.closing_cash)} —{' '}
          {closed.variance === 0 ? 'no variance.' : `variance ${formatCurrency(closed.variance)}.`}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress size={26} aria-label="Loading session" />
        </Box>
      ) : (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper
              elevation={0}
              sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}
            >
              {session ? (
                <>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                    <Typography sx={{ fontWeight: 800 }}>Open session</Typography>
                    <Chip size="small" color="success" label="Open" sx={{ fontWeight: 700 }} />
                  </Stack>

                  <Line label="Opened" value={formatDateTime(session.opened_at)} />
                  <Line label="Opening cash" value={formatCurrency(session.opening_cash)} />
                  <Line label="Transactions" value={session.transactions} />
                  <Line label="Collected (all methods)" value={formatCurrency(session.collected)} />
                  <Line label="Cash collected" value={formatCurrency(session.cash_collected)} />
                  <Box sx={{ borderTop: CARD_BORDER, mt: 1.5, pt: 1 }}>
                    <Line label="Expected in drawer" value={formatCurrency(session.expected_cash)} bold />
                  </Box>

                  <TextField
                    value={closingCash}
                    onChange={(event) => setClosingCash(event.target.value)}
                    label="Counted cash"
                    type="number"
                    size="small"
                    fullWidth
                    sx={{ mt: 2.5 }}
                    inputProps={{ step: '0.01', min: '0' }}
                    InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                  />
                  <TextField
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    label="Notes (optional)"
                    size="small"
                    fullWidth
                    sx={{ mt: 1.5 }}
                  />

                  <Button
                    variant="contained"
                    color="error"
                    onClick={handleClose}
                    disabled={busy || closingCash === ''}
                    sx={{ mt: 2, fontWeight: 700 }}
                  >
                    Close session
                  </Button>
                </>
              ) : (
                <>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>No open session</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                    Count your starting cash and open a session to begin accepting payments.
                  </Typography>

                  <TextField
                    value={openingCash}
                    onChange={(event) => setOpeningCash(event.target.value)}
                    label="Opening cash"
                    type="number"
                    size="small"
                    fullWidth
                    inputProps={{ step: '0.01', min: '0' }}
                    InputProps={{ startAdornment: <InputAdornment position="start">₱</InputAdornment> }}
                  />

                  <Button
                    variant="contained"
                    onClick={handleOpen}
                    disabled={busy || openingCash === ''}
                    sx={{ mt: 2, fontWeight: 700 }}
                  >
                    Open session
                  </Button>
                </>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Recent sessions
            </Typography>

            <Paper
              elevation={0}
              sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}
            >
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Opened</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Expected
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Counted
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">
                        Variance
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No sessions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>{formatDateTime(row.opened_at)}</TableCell>
                          <TableCell align="right">
                            {row.expected_cash === null ? '—' : formatCurrency(row.expected_cash)}
                          </TableCell>
                          <TableCell align="right">
                            {row.closing_cash === null ? '—' : formatCurrency(row.closing_cash)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 700, color: row.variance ? 'warning.dark' : 'text.primary' }}
                          >
                            {row.variance === null ? 'Open' : formatCurrency(row.variance)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default Session;
