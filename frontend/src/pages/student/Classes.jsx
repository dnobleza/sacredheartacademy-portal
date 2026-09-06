import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fetchStudentClasses } from '../../services/studentApi';
import { extractErrorMessage } from '../../services/api';
import { EmptyRow, Loader } from '../../components/student/Feedback';
import { CARD_RADIUS } from '../../theme';
import { formatTime } from '../../utils/format';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

function StudentClasses() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchStudentClasses()
      .then((result) => {
        if (!cancelled) {
          setData(result);
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

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        My Classes
      </Typography>

      {data?.section_name && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {data.grade_level_name} - {data.section_name} · {data.active_academic_year?.name}
        </Typography>
      )}

      {/* The adviser handles the whole section; the teacher on each card below
          only teaches that subject. Hidden when no adviser is assigned. */}
      {data?.adviser?.name && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Adviser:
          </Box>{' '}
          {data.adviser.name}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader label="Loading your classes" />
      ) : data.classes.length === 0 ? (
        <Paper
          elevation={0}
          sx={{ mt: 3, borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}
        >
          <EmptyRow text="No subjects have been assigned to your section yet." />
        </Paper>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {data.classes.map((row) => (
            <Grid key={row.class_subject_id} size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: CARD_RADIUS,
                  border: CARD_BORDER,
                  backgroundColor: '#FFFFFF',
                  p: 3,
                  height: '100%',
                }}
              >
                <Typography sx={{ fontWeight: 800 }}>{row.subject_name}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {row.subject_code}
                </Typography>

                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                  Subject teacher
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {row.teacher_name || 'Not assigned'}
                </Typography>

                <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                  {row.schedule.length === 0 ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No schedule set.
                    </Typography>
                  ) : (
                    row.schedule.map((slot) => (
                      <Typography
                        key={`${slot.day_of_week}-${slot.start_time}`}
                        variant="body2"
                        sx={{ color: 'text.secondary' }}
                      >
                        {slot.day_of_week} · {formatTime(slot.start_time)} –{' '}
                        {formatTime(slot.end_time)}
                        {slot.room ? ` · ${slot.room}` : ''}
                      </Typography>
                    ))
                  )}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default StudentClasses;
