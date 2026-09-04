import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Collapse from '@mui/material/Collapse';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { fetchSectionRoster, fetchTeacherClasses } from '../../services/teacherApi';
import { extractErrorMessage } from '../../services/api';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

// Section names repeat across grade levels, so never show one on its own.
const classLabel = (row) => `${row.grade_level_name} ${row.section_name}`;

const studentName = (student) =>
  [student.last_name, [student.first_name, student.middle_name].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');

/**
 * One class row that expands to its roster. The roster is fetched on first
 * open rather than up front, so a teacher with many classes does not pay for
 * lists they never look at.
 */
function ClassRow({ row, subtitle, badge }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || students !== null) {
      return undefined;
    }

    let cancelled = false;

    fetchSectionRoster(row.section_id)
      .then((data) => {
        if (!cancelled) {
          setStudents(data.students);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load the class list.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, students, row.section_id]);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ p: 2.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography sx={{ fontWeight: 700 }}>{classLabel(row)}</Typography>
            {badge ? (
              <Chip
                label={badge}
                size="small"
                sx={{ backgroundColor: 'primary.light', color: 'primary.dark', fontWeight: 700 }}
              />
            ) : null}
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ color: 'text.secondary', ml: { sm: 'auto' } }}>
          {row.student_count} enrolled
        </Typography>

        <Button
          onClick={() => setOpen((value) => !value)}
          size="small"
          variant="outlined"
          startIcon={open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          sx={{ flexShrink: 0, borderRadius: 2, fontWeight: 700 }}
        >
          {open ? 'Hide students' : 'View students'}
        </Button>
      </Stack>

      <Collapse in={open} unmountOnExit>
        <Box sx={{ px: 2.5, pb: 2.5 }}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          ) : students === null ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 3 }}>
              <CircularProgress size={22} aria-label="Loading class list" />
            </Box>
          ) : students.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No students are enrolled in this section yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {students.map((student, index) => (
                <Stack key={student.id} direction="row" spacing={1.5} alignItems="center">
                  <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 28 }}>
                    {index + 1}.
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {studentName(student)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

function ClassList({ rows, loading, emptyText, subtitleOf, badge }) {
  return (
    <Paper elevation={0} sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
          <CircularProgress size={26} aria-label="Loading classes" />
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.secondary' }}>{emptyText}</Typography>
        </Box>
      ) : (
        <Stack divider={<Box sx={{ borderBottom: CARD_BORDER }} />}>
          {rows.map((row) => (
            <ClassRow key={row.id} row={row} subtitle={subtitleOf(row)} badge={badge} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function TeacherClasses() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchTeacherClasses()
      .then((payload) => {
        if (!cancelled) {
          setData(payload);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your classes.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !error;
  const activeYear = data?.active_academic_year;
  const advisory = data?.advisory_classes || [];
  const subjects = data?.subject_classes || [];

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Classes
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        The sections you advise and the subjects you teach
        {activeYear ? ` for ${activeYear.name}` : ''}.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {data !== null && !activeYear ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: 'rgba(211,90,70,0.06)', p: 3 }}
        >
          <Typography sx={{ fontWeight: 800, color: '#9C3B2A' }}>No active school year</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Class assignments follow the school year an administrator marks active.
          </Typography>
        </Paper>
      ) : (
        <>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Advisory
          </Typography>
          <ClassList
            rows={advisory}
            loading={loading}
            badge="Adviser"
            subtitleOf={(row) => row.room || 'No room set'}
            emptyText="You are not assigned as an adviser this school year."
          />

          <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
            Subjects
          </Typography>
          <ClassList
            rows={subjects}
            loading={loading}
            subtitleOf={(row) => `${row.subject_name}${row.room ? ` · ${row.room}` : ''}`}
            emptyText="No subject classes yet. These appear once an administrator schedules a subject for you."
          />
        </>
      )}
    </Box>
  );
}

export default TeacherClasses;
