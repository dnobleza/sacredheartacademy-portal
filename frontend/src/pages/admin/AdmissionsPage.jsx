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
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Check, Copy, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  acceptAdmission,
  deleteAdmission,
  fetchAdmissions,
  updateAdmissionStatus,
} from '../../services/admissionsApi';
import { extractErrorMessage } from '../../services/api';

const DASH = '—';
const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';
const SUPER_ADMIN_LEVEL = 4;

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'enrolled', label: 'Enrolled' },
];

// MUI chip colours per status; accepted and enrolled are the settled ones.
const STATUS_COLORS = {
  pending: { backgroundColor: 'rgba(32,191,169,0.14)', color: 'primary.dark' },
  reviewing: { backgroundColor: 'rgba(255,193,7,0.18)', color: '#8A6100' },
  accepted: { backgroundColor: 'rgba(21,154,137,0.18)', color: 'primary.dark' },
  rejected: { backgroundColor: 'rgba(211,90,70,0.16)', color: '#9C3B2A' },
  enrolled: { backgroundColor: 'rgba(21,154,137,0.24)', color: 'primary.dark' },
};

const formatDate = (value) => {
  if (!value) {
    return DASH;
  }

  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

const fullName = (row) =>
  [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ');

const displayValue = (value) => (value === null || value === undefined || value === '' ? DASH : value);

function StatusChip({ status }) {
  return (
    <Chip
      label={status}
      size="small"
      sx={{ textTransform: 'capitalize', fontWeight: 700, ...(STATUS_COLORS[status] || {}) }}
    />
  );
}

function DetailRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 1 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
        {displayValue(value)}
      </Typography>
    </Stack>
  );
}

function AdmissionsPage() {
  const { user } = useAuth();
  const isSuperAdmin = (user?.access_level?.level ?? -1) >= SUPER_ADMIN_LEVEL;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmAccept, setConfirmAccept] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    setLoading(true);

    return fetchAdmissions({ page: page + 1, limit: rowsPerPage, search, status })
      .then((data) => {
        setRows(data.admissions);
        setTotal(data.pagination.total);
        setError('');
      })
      .catch((requestError) => {
        setError(extractErrorMessage(requestError, 'Could not load applications.'));
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, search, status]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openDetail = (row) => {
    setSelected(row);
    setRemarks(row.review_remarks || '');
    setError('');
  };

  const runAction = async (action, successMessage) => {
    setBusy(true);

    try {
      const result = await action();
      await load();
      setToast(successMessage);
      return result;
    } catch (requestError) {
      setError(extractErrorMessage(requestError, 'That action did not go through.'));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (nextStatus) => {
    const result = await runAction(
      () => updateAdmissionStatus(selected.id, { status: nextStatus, review_remarks: remarks || null }),
      `Application marked ${nextStatus}.`,
    );

    if (result) {
      setSelected(result);
    }
  };

  const handleAccept = async () => {
    const application = confirmAccept;
    setConfirmAccept(null);

    const result = await runAction(
      () => acceptAdmission(application.id),
      'Application accepted and student account created.',
    );

    if (result) {
      setSelected(result.application);
      // Shown once: the password is hashed server-side and cannot be read back.
      setCredentials(result.student);
    }
  };

  const handleDelete = async () => {
    const application = confirmDelete;
    setConfirmDelete(null);

    const result = await runAction(() => deleteAdmission(application.id), 'Application deleted.');

    if (result) {
      setSelected(null);
    }
  };

  const settled = selected?.status === 'accepted' || selected?.status === 'enrolled';

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Admissions
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        Applications submitted from the public admissions page. Accepting one creates the student
        account.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
          placeholder="Search name, reference, or email"
          size="small"
          sx={{ maxWidth: 360, width: '100%' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={17} />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(0);
          }}
          size="small"
          sx={{ minWidth: 180 }}
          label="Status"
        >
          {STATUS_FILTERS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Paper elevation={0} sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reference</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Applicant</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Grade level</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Submitted</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading && rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center' }}>
                    <CircularProgress size={24} aria-label="Loading applications" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    No applications yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    onClick={() => openDetail(row)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell sx={{ fontWeight: 700 }}>{row.reference_number}</TableCell>
                    <TableCell>{fullName(row)}</TableCell>
                    <TableCell>{row.grade_level_name}</TableCell>
                    <TableCell>{formatDate(row.created_at)}</TableCell>
                    <TableCell>
                      <StatusChip status={row.status} />
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
          onPageChange={(event, nextPage) => setPage(nextPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </Paper>

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        slotProps={{ paper: { sx: { width: { xs: '100%', sm: 460 }, p: 3 } } }}
      >
        {selected && (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="h5">{selected.reference_number}</Typography>
              <IconButton onClick={() => setSelected(null)} aria-label="Close">
                <X size={18} />
              </IconButton>
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <StatusChip status={selected.status} />
              {selected.reviewed_by_name && (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  reviewed by {selected.reviewed_by_name} · {formatDate(selected.reviewed_at)}
                </Typography>
              )}
            </Stack>

            <Typography sx={{ fontWeight: 800, mt: 2 }}>Applicant</Typography>
            <Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />
            <DetailRow label="Name" value={fullName(selected)} />
            <DetailRow label="Grade level" value={selected.grade_level_name} />
            <DetailRow label="School year" value={selected.academic_year_name} />
            <DetailRow label="Birth date" value={formatDate(selected.birth_date)} />
            <DetailRow label="Gender" value={selected.gender} />
            <DetailRow label="Email" value={selected.email} />
            <DetailRow label="Mobile" value={selected.contact_number} />
            <DetailRow label="Address" value={selected.address} />
            <DetailRow label="Previous school" value={selected.previous_school} />

            <Typography sx={{ fontWeight: 800, mt: 3 }}>Parent or guardian</Typography>
            <Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />
            <DetailRow label="Name" value={selected.guardian_name} />
            <DetailRow label="Relationship" value={selected.guardian_relationship} />
            <DetailRow label="Mobile" value={selected.guardian_contact_number} />
            <DetailRow label="Email" value={selected.guardian_email} />

            {selected.notes && (
              <>
                <Typography sx={{ fontWeight: 800, mt: 3, mb: 1 }}>Notes</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', whiteSpace: 'pre-wrap' }}>
                  {selected.notes}
                </Typography>
              </>
            )}

            <Typography sx={{ fontWeight: 800, mt: 3, mb: 1 }}>Review</Typography>

            {settled ? (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                This application was accepted
                {selected.student_id ? ` and is linked to student #${selected.student_id}` : ''}. It
                can no longer be changed.
              </Alert>
            ) : (
              <>
                <TextField
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  label="Remarks (optional)"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  sx={{ mb: 2 }}
                />

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    onClick={() => handleStatus('reviewing')}
                    disabled={busy || selected.status === 'reviewing'}
                    variant="outlined"
                    size="small"
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Mark reviewing
                  </Button>
                  <Button
                    onClick={() => setConfirmAccept(selected)}
                    disabled={busy}
                    variant="contained"
                    size="small"
                    startIcon={<Check size={16} />}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() => handleStatus('rejected')}
                    disabled={busy || selected.status === 'rejected'}
                    color="error"
                    size="small"
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Reject
                  </Button>
                </Stack>
              </>
            )}

            {isSuperAdmin && (
              <Button
                onClick={() => setConfirmDelete(selected)}
                disabled={busy}
                color="error"
                size="small"
                startIcon={<Trash2 size={16} />}
                sx={{ mt: 3, borderRadius: 2, fontWeight: 700 }}
              >
                Delete application
              </Button>
            )}
          </Box>
        )}
      </Drawer>

      <Dialog open={Boolean(confirmAccept)} onClose={() => setConfirmAccept(null)}>
        <DialogTitle>Accept this application?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This creates a student account for {confirmAccept ? fullName(confirmAccept) : ''} using{' '}
            {confirmAccept?.email} and shows a temporary password once. Assigning a section stays a
            separate step on the Classes screen.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAccept(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleAccept} variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Accept and create account
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDelete)} onClose={() => setConfirmDelete(null)}>
        <DialogTitle>Delete this application?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            The submitted record is removed permanently. Rejecting keeps it on file instead.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(credentials)} onClose={() => setCredentials(null)}>
        <DialogTitle>Student account created</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Give these to the family. The password is stored hashed and cannot be shown again — issue
            a new one from the Students screen if it is lost.
          </DialogContentText>

          <Paper elevation={0} sx={{ border: CARD_BORDER, borderRadius: 2, p: 2 }}>
            <DetailRow label="Email" value={credentials?.email} />
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                Temporary password
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                  {credentials?.temporary_password}
                </Typography>
                <IconButton
                  size="small"
                  aria-label="Copy password"
                  onClick={() => {
                    navigator.clipboard
                      ?.writeText(credentials.temporary_password)
                      .then(() => setToast('Password copied.'))
                      .catch(() => setToast('Could not copy. Select the text instead.'));
                  }}
                >
                  <Copy size={15} />
                </IconButton>
              </Stack>
            </Stack>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCredentials(null)} variant="contained" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Done
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}

export default AdmissionsPage;
