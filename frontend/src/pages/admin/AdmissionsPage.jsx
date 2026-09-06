import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Check, Copy, CornerUpLeft, FileText, Search, Trash2, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  acceptAdmission,
  deleteAdmission,
  fetchAdmissions,
  fetchAdmission,
  fetchAdmissionDocumentUrl,
  returnAdmission,
  enrollAdmission,
  updateAdmissionStatus,
} from '../../services/admissionsApi';
import { extractErrorMessage } from '../../services/api';
import { fetchSectionCapacity } from '../../services/enrollmentsApi';
import { formatCurrency } from '../../utils/format';
import { CARD_RADIUS } from '../../theme';

const DASH = '—';
const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';
const SUPER_ADMIN_LEVEL = 4;

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'returned', label: 'Returned' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'enrolled', label: 'Enrolled' },
];

// MUI chip colours per status; accepted and enrolled are the settled ones.
const STATUS_COLORS = {
  pending: { backgroundColor: 'rgba(32,191,169,0.14)', color: 'primary.dark' },
  reviewing: { backgroundColor: 'rgba(255,193,7,0.18)', color: '#8A6100' },
  returned: { backgroundColor: 'rgba(211,90,70,0.12)', color: '#9C3B2A' },
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

const DOCUMENT_LABELS = {
  good_moral: 'Good Moral Certificate',
  form_137: 'Form 137',
  psa_birth_certificate: 'PSA Birth Certificate',
  id_picture: '2x2 ID Picture',
};

// Mirrors RETURNABLE_FIELDS in backend/src/validations/admission-validation.js.
const RETURNABLE_FIELDS = {
  first_name: 'First name',
  middle_name: 'Middle name',
  last_name: 'Last name',
  birth_date: 'Birth date',
  gender: 'Gender',
  address: 'Home address',
  contact_number: 'Mobile number',
  previous_school: 'Previous school',
  guardian_name: 'Parent or guardian name',
  guardian_relationship: 'Relationship',
  guardian_contact_number: 'Parent or guardian mobile',
  guardian_email: 'Parent or guardian email',
};

const ENROLLMENT_TYPE_LABELS = {
  new: 'New Student',
  returning: 'Returning Student',
  transferee: 'Transferee',
};

const formatBytes = (bytes) => {
  if (!bytes) {
    return '';
  }

  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

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
  const [documents, setDocuments] = useState([]);
  const [detail, setDetail] = useState(null);
  const [sections, setSections] = useState([]);
  const [returnDraft, setReturnDraft] = useState(null);
  const [placement, setPlacement] = useState({ grade_level_id: '', section_id: '' });
  const [confirmEnroll, setConfirmEnroll] = useState(null);
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

  useEffect(() => {
    fetchSectionCapacity()
      .then((data) => setSections(data.sections))
      .catch(() => setSections([]));
  }, []);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const openDetail = (row) => {
    setSelected(row);
    setRemarks(row.review_remarks || '');
    setError('');

    
    
    setDocuments([]);
    setDetail(null);
    fetchAdmission(row.id)
      .then((full) => {
        setDocuments(full.documents || []);
        setDetail(full);



        setPlacement({
          grade_level_id: full.grade_level_id || '',
          section_id: full.suggested_section?.id || '',
        });
      })
      .catch(() => setToast('Could not load the application details.'));
  };

  
  
  const openDocument = (documentId) => {
    fetchAdmissionDocumentUrl(selected.id, documentId)
      .then((url) => {
        window.open(url, '_blank', 'noopener');
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      })
      .catch(() => setToast('Could not open that document.'));
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
      () => acceptAdmission(application.id, { review_remarks: remarks || null }),
      'Application approved. The applicant can now pay.',
    );

    if (result) {
      setSelected(result.application);
      // Shown once: the password is hashed server-side and cannot be read back.
      setCredentials({ ...result.student, placement: result.placement });
    }
  };

  const toggleReturnItem = (itemType, itemKey) =>
    setReturnDraft((current) => {
      const items = current.items.filter(
        (item) => !(item.item_type === itemType && item.item_key === itemKey),
      );

      const wasSelected = items.length !== current.items.length;

      return {
        ...current,
        items: wasSelected ? items : [...items, { item_type: itemType, item_key: itemKey, note: '' }],
      };
    });

  const setReturnNote = (itemType, itemKey, note) =>
    setReturnDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.item_type === itemType && item.item_key === itemKey ? { ...item, note } : item,
      ),
    }));

  const handleReturn = async () => {
    const draft = returnDraft;
    setReturnDraft(null);

    const result = await runAction(
      () =>
        returnAdmission(draft.id, {
          items: draft.items.map((item) => ({
            item_type: item.item_type,
            item_key: item.item_key,
            note: item.note ? item.note.trim() : null,
          })),
          review_remarks: draft.remarks || null,
        }),
      'Application returned to the applicant.',
    );

    if (result) {
      setSelected(result);
      setDetail((current) => (current ? { ...current, return_items: result.return_items } : current));
    }
  };

  const handleEnroll = async (override = false) => {
    const application = confirmEnroll;
    setConfirmEnroll(null);

    const result = await runAction(
      () =>
        enrollAdmission(application.id, {
          ...(placement.section_id ? { section_id: Number(placement.section_id) } : {}),
          ...(override ? { override: true } : {}),
        }),
      'Student enrolled.',
    );

    if (result) {
      setSelected(result.application);
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

  // Grade levels come from the section list rather than a second request:
  // a grade with no section cannot receive a student anyway.
  const gradeLevelOptions = useMemo(() => {
    const seen = new Map();

    sections.forEach((section) => {
      if (!seen.has(section.grade_level_id)) {
        seen.set(section.grade_level_id, section.grade_level_name);
      }
    });

    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [sections]);

  const sectionOptions = useMemo(
    () => sections.filter((section) => section.grade_level_id === Number(placement.grade_level_id)),
    [sections, placement.grade_level_id],
  );

  const chosenSection = sections.find((section) => section.id === Number(placement.section_id));
  const wouldOverfill = Boolean(
    chosenSection && Number(chosenSection.student_count) >= Number(chosenSection.capacity),
  );

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
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }} onClose={() => setError('')}>
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

      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
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
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h5">{selected.reference_number}</Typography>
                {selected.submission_count > 1 && (
                  <Chip
                    size="small"
                    label={`Submitted ${selected.submission_count}×`}
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Stack>
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
            <DetailRow
              label="Enrollment type"
              value={ENROLLMENT_TYPE_LABELS[selected.enrollment_type] || selected.enrollment_type}
            />
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

            <Typography sx={{ fontWeight: 800, mt: 3, mb: 1 }}>Documents</Typography>

            <Stack spacing={1}>
              {Object.entries(DOCUMENT_LABELS).map(([type, label]) => {
                const document = documents.find((row) => row.document_type === type);

                return (
                  <Stack
                    key={type}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                    sx={{ border: CARD_BORDER, borderRadius: CARD_RADIUS, p: 1.5 }}
                  >
                    <Box
                      aria-hidden="true"
                      sx={{
                        color: document ? 'primary.dark' : 'text.disabled',
                        display: 'flex',
                        flexShrink: 0,
                      }}
                    >
                      <FileText size={18} />
                    </Box>

                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {label}
                        </Typography>
                        {(detail?.required_documents || []).includes(type) && (
                          <Chip
                            size="small"
                            label={document ? 'Required' : 'Required · missing'}
                            color={document ? 'default' : 'warning'}
                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700 }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                        {document
                          ? `${document.original_name || 'Attached'} · ${formatBytes(document.size_bytes)}`
                          : 'Not submitted'}
                      </Typography>
                    </Box>

                    {document && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openDocument(document.id)}
                        sx={{ ml: 'auto', flexShrink: 0, borderRadius: CARD_RADIUS, fontWeight: 700 }}
                      >
                        View
                      </Button>
                    )}
                  </Stack>
                );
              })}
            </Stack>

            {(detail?.return_items || []).length > 0 && (
              <>
                <Typography sx={{ fontWeight: 800, mt: 3, mb: 1 }}>Returned items</Typography>
                <Stack spacing={1}>
                  {detail.return_items.map((item) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      alignItems="center"
                      spacing={1}
                      sx={{ border: CARD_BORDER, borderRadius: CARD_RADIUS, p: 1.5 }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {DOCUMENT_LABELS[item.item_key]
                            || RETURNABLE_FIELDS[item.item_key]
                            || item.item_key}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {item.note || 'No note'}
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={item.resolved_at ? 'Fixed' : 'Waiting'}
                        color={item.resolved_at ? 'success' : 'warning'}
                        sx={{ ml: 'auto', fontWeight: 700 }}
                      />
                    </Stack>
                  ))}
                </Stack>
              </>
            )}

            <Typography sx={{ fontWeight: 800, mt: 3, mb: 1 }}>Review</Typography>

            {selected.status === 'accepted' && (
              <Box sx={{ mb: 2 }}>
                {detail?.downpayment?.required ? (
                  <Alert
                    severity={detail.ready_to_enroll ? 'success' : 'warning'}
                    sx={{ borderRadius: CARD_RADIUS }}
                  >
                    {detail.ready_to_enroll
                      ? `Downpayment settled — ${formatCurrency(detail.downpayment.paid)} paid.`
                      : `Awaiting downpayment — ${formatCurrency(detail.downpayment.paid)} of ${formatCurrency(
                        detail.downpayment.required,
                      )} paid.`}
                  </Alert>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: CARD_RADIUS }}>
                    No downpayment is set for this grade level, so the student can be enrolled now.
                  </Alert>
                )}

                <Button
                  onClick={() => setConfirmEnroll(selected)}
                  disabled={busy || (detail?.downpayment?.required > 0 && !detail?.ready_to_enroll)}
                  variant="contained"
                  size="small"
                  sx={{ mt: 1.5, borderRadius: CARD_RADIUS, fontWeight: 700 }}
                >
                  Enroll student
                </Button>
              </Box>
            )}

            {settled ? (
              <Alert severity="success" sx={{ borderRadius: CARD_RADIUS }}>
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
                    sx={{ borderRadius: CARD_RADIUS, fontWeight: 700 }}
                  >
                    Mark reviewing
                  </Button>
                  <Button
                    onClick={() => setConfirmAccept(selected)}
                    disabled={busy}
                    variant="contained"
                    size="small"
                    startIcon={<Check size={16} />}
                    sx={{ borderRadius: CARD_RADIUS, fontWeight: 700 }}
                  >
                    Accept
                  </Button>
                  <Button
                    onClick={() =>
                      setReturnDraft({ id: selected.id, items: [], remarks: remarks || '' })
                    }
                    disabled={busy || selected.status === 'returned'}
                    variant="outlined"
                    size="small"
                    startIcon={<CornerUpLeft size={16} />}
                    sx={{ borderRadius: CARD_RADIUS, fontWeight: 700 }}
                  >
                    Return to applicant
                  </Button>
                  <Button
                    onClick={() => handleStatus('rejected')}
                    disabled={busy || selected.status === 'rejected'}
                    color="error"
                    size="small"
                    sx={{ borderRadius: CARD_RADIUS, fontWeight: 700 }}
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
                sx={{ mt: 3, borderRadius: CARD_RADIUS, fontWeight: 700 }}
              >
                Delete application
              </Button>
            )}
          </Box>
        )}
      </Drawer>

      <Dialog open={Boolean(confirmAccept)} onClose={() => setConfirmAccept(null)}>
        <DialogTitle>Approve this application?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This creates a student account for {confirmAccept ? fullName(confirmAccept) : ''} using{' '}
            {confirmAccept?.email}, applies their fees, and shows a temporary password once.
            {detail?.downpayment?.required
              ? ` They must pay ${formatCurrency(detail.downpayment.required)} before they can be enrolled.`
              : ' They can be enrolled straight away — no downpayment is set for that grade level.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAccept(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleAccept()}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Approve application
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

          {credentials?.placement?.assigned ? (
            <Alert severity="success" sx={{ borderRadius: CARD_RADIUS, mb: 2 }}>
              Enrolled in {credentials.placement.grade_level_name}{' '}
              {credentials.placement.section_name} for {credentials.placement.academic_year_name}.
            </Alert>
          ) : (
            <Alert severity="warning" sx={{ borderRadius: CARD_RADIUS, mb: 2 }}>
              {credentials?.placement?.reason || 'The student was not enrolled.'} Place them from
              the Enrollment screen.
            </Alert>
          )}

          <Paper elevation={0} sx={{ border: CARD_BORDER, borderRadius: CARD_RADIUS, p: 2 }}>
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

      <Dialog open={Boolean(confirmEnroll)} onClose={() => setConfirmEnroll(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Enroll this student?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            {confirmEnroll ? fullName(confirmEnroll) : ''} will be enrolled for{' '}
            {confirmEnroll?.academic_year_name || 'the active school year'}. Leave the section on
            Automatic to give them the first one with room.
          </DialogContentText>

          <TextField
            select
            label="Section"
            value={placement.section_id}
            onChange={(event) =>
              setPlacement((current) => ({ ...current, section_id: event.target.value }))
            }
            size="small"
            fullWidth
            helperText={
              detail?.suggested_section
                ? `Automatic: ${detail.suggested_section.grade_level_name} ${detail.suggested_section.name}`
                : 'No section in that grade level has room.'
            }
          >
            <MenuItem value="">Automatic</MenuItem>
            {sections
              .filter((section) => section.grade_level_id === confirmEnroll?.grade_level_id)
              .map((section) => (
                <MenuItem key={section.id} value={section.id}>
                  {`${section.grade_level_name} · ${section.name} (${section.student_count}/${section.capacity})`}
                  {Number(section.student_count) >= Number(section.capacity) ? ' · full' : ''}
                </MenuItem>
              ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEnroll(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => handleEnroll(wouldOverfill)}
            variant="contained"
            color={wouldOverfill ? 'warning' : 'primary'}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            {wouldOverfill ? 'Over-fill and enroll' : 'Enroll'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(returnDraft)}
        onClose={() => setReturnDraft(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Return to the applicant</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Tick everything that needs fixing. The applicant sees exactly this list, with your
            notes, on the status page — and can only resubmit what you flag.
          </DialogContentText>

          <Typography sx={{ fontWeight: 800, mb: 1 }}>Documents</Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {Object.entries(DOCUMENT_LABELS).map(([type, label]) => {
              const item = returnDraft?.items.find(
                (entry) => entry.item_type === 'document' && entry.item_key === type,
              );

              return (
                <Box key={type}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={Boolean(item)}
                        onChange={() => toggleReturnItem('document', type)}
                      />
                    }
                    label={label}
                  />
                  {item && (
                    <TextField
                      value={item.note}
                      onChange={(event) => setReturnNote('document', type, event.target.value)}
                      placeholder="What is wrong with it?"
                      size="small"
                      fullWidth
                      sx={{ ml: 4, mb: 1, maxWidth: 'calc(100% - 32px)' }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>

          <Typography sx={{ fontWeight: 800, mb: 1 }}>Information</Typography>
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            {Object.entries(RETURNABLE_FIELDS).map(([field, label]) => {
              const item = returnDraft?.items.find(
                (entry) => entry.item_type === 'information' && entry.item_key === field,
              );

              return (
                <Box key={field}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={Boolean(item)}
                        onChange={() => toggleReturnItem('information', field)}
                      />
                    }
                    label={label}
                  />
                  {item && (
                    <TextField
                      value={item.note}
                      onChange={(event) => setReturnNote('information', field, event.target.value)}
                      placeholder="What should it say?"
                      size="small"
                      fullWidth
                      sx={{ ml: 4, mb: 1, maxWidth: 'calc(100% - 32px)' }}
                    />
                  )}
                </Box>
              );
            })}
          </Stack>

          <TextField
            value={returnDraft?.remarks || ''}
            onChange={(event) =>
              setReturnDraft((current) => ({ ...current, remarks: event.target.value }))
            }
            label="Overall remarks (optional)"
            size="small"
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDraft(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleReturn}
            disabled={!returnDraft || returnDraft.items.length === 0}
            variant="contained"
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Return application
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
