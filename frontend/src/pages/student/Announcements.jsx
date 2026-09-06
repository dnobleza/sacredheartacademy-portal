import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { fetchStudentDashboard } from '../../services/studentApi';
import { extractErrorMessage } from '../../services/api';
import AnnouncementPost from '../../components/common/AnnouncementPost';
import { EmptyRow, Loader } from '../../components/student/Feedback';
import { CARD_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

/**
 * Announcements ride along on the dashboard payload — the same rows, already
 * filtered to the ones addressed to students, so there is no second endpoint
 * to call.
 */
function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchStudentDashboard()
      .then((data) => {
        if (!cancelled) {
          setAnnouncements(data.announcements);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load announcements.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = announcements === null && !error;

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Announcements
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        {loading ? (
          <Loader label="Loading announcements" />
        ) : announcements.length === 0 ? (
          <Paper
            elevation={0}
            sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}
          >
            <EmptyRow text="No announcements yet." />
          </Paper>
        ) : (
          <Stack spacing={2}>
            {announcements.map((announcement) => (
              <AnnouncementPost key={announcement.id} announcement={announcement} />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default StudentAnnouncements;
