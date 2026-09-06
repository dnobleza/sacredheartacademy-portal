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
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
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
import {
  dropEnrollment,
  enrollStudent,
  fetchEnrollments,
  fetchSectionCapacity,
  moveEnrollment,
} from '../../services/enrollmentsApi';
import { extractErrorMessage } from '../../services/api';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const fullName = (row) => [row.first_name, row.last_name].filter(Boolean).join(' ').trim();

const isFull = (section) => Number(section.student_count) >= Number(section.capacity);

const sectionLabel = (section) =>
  `${section.grade_level_name} ${section.name} (${section.student_count}/${section.capacity})`;

function EnrollmentPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [academicYear, setAcademicYear] = useState(null);
  const [sections, setSections] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [gradeLevelId, setGradeLevelId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyStudentId, setBusyStudentId] = useState(null);
  const [confirmOverfill, setConfirmOverfill] = useState(null);
  const [confirmDrop, setConfirmDrop] = useState(null);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    setLoading(true);

    return fetchEnrollments({
      page: page + 1,
      limit: rowsPerPage,
      search,
      gradeLevelId,
      sectionId,
      unassigned: unassignedOnly,
    })
      .then((data) => {
        setRows(data.enrollments);
        setTotal(data.pagination.total);
        setAcademicYear(data.academic_year);
        setError('');
      })
      .catch((requestError) => {
        setError(extractErrorMessage(requestError, 'Could not load enrollments.'));
      })
      .finally(() => setLoading(false));
  }, [page, rowsPerPage, search, gradeLevelId, sectionId, unassignedOnly]);

  const loadSections = useCallback(
    () =>
      fetchSectionCapacity()
        .then((data) => setSections(data.sections))
        .catch(() => setToast('Could not load section capacities.')),
    [],
  );

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    loadSections();
  }, [loadSections]);

  const gradeLevels = useMemo(() => {
    const seen = new Map();

    sections.forEach((section) => {
      if (!seen.has(section.grade_level_id)) {
        seen.set(section.grade_level_id, section.grade_level_name);
      }
    });

    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [sections]);

  const refresh = () => Promise.all([load(), loadSections()]);

  const runAction = async (studentId, action, successMessage) => {
    setBusyStudentId(studentId);

    try {
      await action();
      setToast(successMessage);
      await refresh();
    } catch (requestError) {
      setToast(extractErrorMessage(requestError, 'That change did not go through.'));
    } finally {
      setBusyStudentId(null);
    }
  };

  // A move into a full section is refused by the server unless it is told to
  // override, so ask first rather than swallowing the rejection.
  const changeSection = (row, nextSectionId) => {
    const section = sections.find((entry) => entry.id === Number(nextSectionId));

    if (section && isFull(section) && section.id !== row.section_id) {
      setConfirmOverfill({ row, section });
      return;
    }

    applySection(row, Number(nextSectionId), false);
  };

  const applySection = (row, nextSectionId, override) =>
    runAction(
      row.student_id,
      () =>
        row.enrollment_id
          ? moveEnrollment(row.enrollment_id, { section_id: nextSectionId, override })
          : enrollStudent({ student_id: row.student_id, section_id: nextSectionId, override }),
      row.enrollment_id ? 'Student moved.' : 'Student enrolled.',
    );

  const handleDrop = async () => {
    const row = confirmDrop;
    setConfirmDrop(null);

    await runAction(row.student_id, () => dropEnrollment(row.enrollment_id), 'Enrollment dropped.');
  };

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Enrollment
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        {academicYear
          ? `Placing students for ${academicYear.name}. Accepting an application fills sections in order; move anyone who needs a different one.`
          : 'Set a school year as active before placing students.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 2, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
          <TextField
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            placeholder="Search students"
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
            value={gradeLevelId}
            onChange={(event) => {
              setGradeLevelId(event.target.value);
              setSectionId('');
              setPage(0);
            }}
            label="Grade level"
            size="small"
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All grade levels</MenuItem>
            {gradeLevels.map((level) => (
              <MenuItem key={level.id} value={level.id}>
                {level.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            value={sectionId}
            onChange={(event) => {
              setSectionId(event.target.value);
              setPage(0);
            }}
            label="Section"
            size="small"
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All sections</MenuItem>
            {sections
              .filter((section) => !gradeLevelId || section.grade_level_id === gradeLevelId)
              .map((section) => (
                <MenuItem key={section.id} value={section.id}>
                  {sectionLabel(section)}
                </MenuItem>
              ))}
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={unassignedOnly}
                onChange={(event) => {
                  setUnassignedOnly(event.target.checked);
                  setPage(0);
                }}
              />
            }
            label="Not enrolled only"
            sx={{ ml: { md: 'auto' } }}
          />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Grade level</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Section</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={26} aria-label="Loading enrollments" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No students match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.student_id} hover>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {fullName(row) || row.email}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {row.email}
                      </Typography>
                    </TableCell>

                    <TableCell>{row.grade_level_name || '—'}</TableCell>

                    <TableCell sx={{ minWidth: 260 }}>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={row.section_id || ''}
                        disabled={busyStudentId === row.student_id || !academicYear}
                        onChange={(event) => changeSection(row, event.target.value)}
                      >
                        <MenuItem value="" disabled>
                          Not enrolled
                        </MenuItem>
                        {sections.map((section) => (
                          <MenuItem key={section.id} value={section.id}>
                            {sectionLabel(section)}
                            {isFull(section) && section.id !== row.section_id ? ' · full' : ''}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>

                    <TableCell align="right">
                      {row.enrollment_id ? (
                        <Button
                          size="small"
                          color="error"
                          disabled={busyStudentId === row.student_id}
                          onClick={() => setConfirmDrop(row)}
                          sx={{ fontWeight: 700 }}
                        >
                          Drop
                        </Button>
                      ) : (
                        <Chip size="small" label="Not enrolled" sx={{ fontWeight: 700 }} />
                      )}
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

      <Dialog open={Boolean(confirmOverfill)} onClose={() => setConfirmOverfill(null)}>
        <DialogTitle>Section is full</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmOverfill
              ? `${confirmOverfill.section.grade_level_name} ${confirmOverfill.section.name} already holds ${confirmOverfill.section.student_count} of ${confirmOverfill.section.capacity} students. Place ${fullName(confirmOverfill.row)} there anyway?`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOverfill(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              const { row, section } = confirmOverfill;
              setConfirmOverfill(null);
              applySection(row, section.id, true);
            }}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Place anyway
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmDrop)} onClose={() => setConfirmDrop(null)}>
        <DialogTitle>Drop this enrollment?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDrop
              ? `${fullName(confirmDrop)} will be marked dropped for ${academicYear?.name}. The record is kept, not deleted, and they can be enrolled again.`
              : ''}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDrop(null)} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={handleDrop} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Drop
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
      />
    </Box>
  );
}

export default EnrollmentPage;
