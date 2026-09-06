import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
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
import { Search } from 'lucide-react';
import { fetchAdvisoryStudents } from '../../services/teacherApi';
import { fetchImageObjectUrl } from '../../services/imagesApi';
import { extractErrorMessage } from '../../services/api';
import { AQUA_GRADIENT, CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';
const DASH = '—';

const fullName = (person) =>
  [person.first_name, person.middle_name, person.last_name].filter(Boolean).join(' ').trim();

const initials = (person) =>
  [person.first_name, person.last_name]
    .filter(Boolean)
    .map((part) => part.trim()[0])
    .join('')
    .toUpperCase() || '?';

/**
 * Profile photos sit behind the authenticated /images/:id endpoint, so they
 * cannot be used as a plain src. One class is a small enough list to fetch a
 * blob per student; initials stand in while it loads, when there is no photo,
 * and when the fetch fails.
 */
function StudentAvatar({ student }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!student.photo_id) {
      return undefined;
    }

    let objectUrl = '';
    let cancelled = false;

    fetchImageObjectUrl(student.photo_id)
      .then((value) => {
        objectUrl = value;

        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setUrl(value);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [student.photo_id]);

  return (
    <Avatar
      src={url || undefined}
      sx={{ width: 40, height: 40, fontSize: '0.85rem', fontWeight: 700, background: AQUA_GRADIENT }}
    >
      {initials(student)}
    </Avatar>
  );
}

function GuardianCell({ guardians }) {
  if (!guardians || guardians.length === 0) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>{DASH}</Typography>;
  }

  // The list arrives with the primary contact first; a student can have several
  // guardians, so the rest are acknowledged rather than hidden.
  const [primary, ...rest] = guardians;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.75}>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {[primary.first_name, primary.last_name].filter(Boolean).join(' ')}
        </Typography>
        {rest.length > 0 && (
          <Chip size="small" label={`+${rest.length} more`} sx={{ height: 18, fontSize: '0.65rem' }} />
        )}
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {[primary.relationship, primary.contact_number].filter(Boolean).join(' · ') || DASH}
      </Typography>
    </Box>
  );
}

function AdvisoryStudents() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchAdvisoryStudents()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your advisory class.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !error;
  const advisoryClasses = data?.advisory_classes || [];
  const activeYear = data?.active_academic_year;

  // The roster is already in memory and a class is small, so filtering here
  // beats a round trip per keystroke.
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return advisoryClasses;
    }

    return advisoryClasses.map((advisoryClass) => ({
      ...advisoryClass,
      students: advisoryClass.students.filter((student) =>
        fullName(student).toLowerCase().includes(term),
      ),
    }));
  }, [advisoryClasses, search]);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        My Advisory Class
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        {activeYear
          ? `The students enrolled in your advisory section for ${activeYear.name}.`
          : 'Advisory classes follow the active school year.'}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress size={26} aria-label="Loading your advisory class" />
        </Box>
      ) : advisoryClasses.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', py: 6, textAlign: 'center' }}
        >
          <Typography sx={{ color: 'text.secondary' }}>
            You are not assigned as an adviser this school year.
          </Typography>
        </Paper>
      ) : (
        <>
          <TextField
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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

          <Stack spacing={4}>
            {filtered.map((advisoryClass) => (
              <Box key={advisoryClass.id}>
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 2 }}>
                  <Typography variant="h5">
                    {advisoryClass.grade_level_name} {advisoryClass.section_name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {advisoryClass.room || 'No room set'} · {advisoryClass.student_count} enrolled
                  </Typography>
                </Stack>

                <Paper
                  elevation={0}
                  sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}
                >
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Student</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Guardian</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {advisoryClass.students.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                              {search ? 'No student matches that search.' : 'No students enrolled yet.'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          advisoryClass.students.map((student) => (
                            <TableRow key={student.id} hover>
                              <TableCell>
                                <Stack direction="row" alignItems="center" spacing={1.5}>
                                  <StudentAvatar student={student} />
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {fullName(student)}
                                  </Typography>
                                </Stack>
                              </TableCell>

                              <TableCell>
                                <Typography variant="body2">{student.email || DASH}</Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {student.contact_number || DASH}
                                </Typography>
                              </TableCell>

                              <TableCell>
                                <GuardianCell guardians={student.guardians} />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Box>
            ))}
          </Stack>
        </>
      )}
    </Box>
  );
}

export default AdvisoryStudents;
