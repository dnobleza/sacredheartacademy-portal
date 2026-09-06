import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fetchStudentSchedule } from '../../services/studentApi';
import { extractErrorMessage } from '../../services/api';
import { EmptyRow, Loader } from '../../components/student/Feedback';
import { CARD_RADIUS } from '../../theme';
import { formatTime } from '../../utils/format';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const today = () => new Date().toLocaleDateString('en-US', { weekday: 'long' });

function StudentSchedule() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchStudentSchedule()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your schedule.'));
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
        Schedule
      </Typography>

      {data?.section_name && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {data.grade_level_name} - {data.section_name} · {data.active_academic_year?.name}
        </Typography>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader label="Loading your schedule" />
      ) : (
        <Stack spacing={3} sx={{ mt: 3 }}>
          {data.days.map((day) => (
            <Paper
              key={day.day}
              elevation={0}
              sx={{
                borderRadius: CARD_RADIUS,
                border: CARD_BORDER,
                backgroundColor: '#FFFFFF',
                overflow: 'hidden',
              }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ px: 3, py: 1.5, backgroundColor: day.day === today() ? 'primary.light' : 'transparent' }}
              >
                <Typography sx={{ fontWeight: 800 }}>{day.day}</Typography>
                {day.day === today() && (
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'primary.dark' }}>
                    Today
                  </Typography>
                )}
              </Stack>

              {day.slots.length === 0 ? (
                <EmptyRow text="No classes." />
              ) : (
                day.slots.map((slot) => (
                  <Stack
                    key={slot.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.5, sm: 2 }}
                    alignItems={{ sm: 'center' }}
                    sx={{ px: 3, py: 2, borderTop: CARD_BORDER }}
                  >
                    <Typography sx={{ fontWeight: 700, minWidth: 170 }}>
                      {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                    </Typography>
                    <Typography sx={{ fontWeight: 600, flex: 1 }}>{slot.subject_name}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
                      {slot.teacher_name || 'Teacher not assigned'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {slot.room || '—'}
                    </Typography>
                  </Stack>
                ))
              )}
            </Paper>
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default StudentSchedule;
