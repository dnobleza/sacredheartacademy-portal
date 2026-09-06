import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { CalendarClock, ClipboardList, FileText, Users2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchStudentDashboard } from '../../services/studentApi';
import { extractErrorMessage } from '../../services/api';
import AnnouncementPost from '../../components/common/AnnouncementPost';
import StatCard from '../../components/student/StatCard';
import SectionPanel from '../../components/student/SectionPanel';
import { EmptyRow, Loader } from '../../components/student/Feedback';
import { CARD_RADIUS } from '../../theme';
import { formatDate, formatTime, greeting } from '../../utils/format';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const CARDS = [
  { key: 'average', label: 'Average', Icon: ClipboardList, suffix: '%' },
  { key: 'attendance_rate', label: 'Attendance', Icon: CalendarClock, suffix: '%' },
  { key: 'subjects', label: 'Subjects', Icon: Users2 },
  { key: 'pending_assignments', label: 'Assignments', Icon: FileText },
];

// The registrar may not have placed the student in a section yet, and a
// section may have no adviser — an absent line is better than an empty one.
function IdentityLine({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
        {label}:
      </Box>{' '}
      {value}
    </Typography>
  );
}

const dueLabel = (dueDate) => {
  if (!dueDate) {
    return 'No due date';
  }

  const due = new Date(dueDate);
  const days = Math.ceil((due.getTime() - Date.now()) / (24 * 60 * 60 * 1000));

  if (days <= 0) {
    return 'Due today';
  }

  return days === 1 ? 'Due tomorrow' : `Due ${formatDate(dueDate)}`;
};

function StudentOverview() {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchStudentDashboard()
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your dashboard.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = dashboard === null && !error;
  const student = dashboard?.student;
  const stats = dashboard?.stats;

  const gradeAndSection =
    student?.grade_level_name && student?.section_name
      ? `${student.grade_level_name} - ${student.section_name}`
      : student?.grade_level_name || null;

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        {greeting()}, {profile?.first_name || 'there'}!
      </Typography>

      <Paper
        elevation={0}
        sx={{
          mt: 2,
          borderRadius: CARD_RADIUS,
          border: CARD_BORDER,
          backgroundColor: '#FFFFFF',
          p: 3,
        }}
      >
        <Stack spacing={0.5}>
          <IdentityLine label="Student No" value={student?.student_number} />
          <IdentityLine label="Class" value={gradeAndSection} />
          <IdentityLine label="School Year" value={dashboard?.active_academic_year?.name} />
          <IdentityLine label="Adviser" value={student?.adviser?.name} />

          {!loading && !student?.student_number && !gradeAndSection && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Your enrollment is not complete yet. Once the registrar places you in a section, your
              class, adviser and subjects appear here.
            </Typography>
          )}
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        {CARDS.map((card) => (
          <Grid key={card.key} size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard
              label={card.label}
              Icon={card.Icon}
              loading={loading}
              value={
                stats?.[card.key] === null || stats?.[card.key] === undefined
                  ? null
                  : `${stats[card.key]}${card.suffix || ''}`
              }
            />
          </Grid>
        ))}
      </Grid>

      <SectionPanel
        title="Today's Schedule"
        action={
          <Button component={RouterLink} to="/student/schedule" size="small" sx={{ textTransform: 'none', fontWeight: 700 }}>
            Full week
          </Button>
        }
      >
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <Loader label="Loading your schedule" />
          ) : dashboard.today_schedule.length === 0 ? (
            <EmptyRow text="No classes scheduled today." />
          ) : (
            dashboard.today_schedule.map((slot, index) => (
              <Stack
                key={slot.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.5, sm: 2 }}
                alignItems={{ sm: 'center' }}
                sx={{ px: 3, py: 2, borderTop: index === 0 ? 'none' : CARD_BORDER }}
              >
                <Typography sx={{ fontWeight: 700, minWidth: 96 }}>
                  {formatTime(slot.start_time)}
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
      </SectionPanel>

      <SectionPanel
        title="My Grades"
        action={
          <Button component={RouterLink} to="/student/grades" size="small" sx={{ textTransform: 'none', fontWeight: 700 }}>
            All periods
          </Button>
        }
      >
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <Loader label="Loading your grades" />
          ) : dashboard.grades.length === 0 ? (
            <EmptyRow text="No grades have been posted yet." />
          ) : (
            dashboard.grades.map((row, index) => (
              <Stack
                key={row.class_subject_id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ px: 3, py: 2, borderTop: index === 0 ? 'none' : CARD_BORDER }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{row.subject_name}</Typography>
                  {row.teacher_name && (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {row.teacher_name}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontWeight: 800, color: 'primary.main' }}>
                  {row.grade === null ? '—' : row.grade}
                </Typography>
              </Stack>
            ))
          )}
        </Paper>
      </SectionPanel>

      <SectionPanel title="Upcoming Assignments">
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <Loader label="Loading your assignments" />
          ) : dashboard.upcoming_assignments.length === 0 ? (
            <EmptyRow text="Nothing due right now." />
          ) : (
            dashboard.upcoming_assignments.map((row, index) => (
              <Stack
                key={row.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={{ xs: 0.5, sm: 2 }}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
                sx={{ px: 3, py: 2, borderTop: index === 0 ? 'none' : CARD_BORDER }}
              >
                <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 160 }}>
                  {row.subject_name}
                </Typography>
                <Typography sx={{ fontWeight: 600, flex: 1 }}>{row.title}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {dueLabel(row.due_date)}
                </Typography>
              </Stack>
            ))
          )}
        </Paper>
      </SectionPanel>

      <SectionPanel
        title="Announcements"
        action={
          <Button component={RouterLink} to="/student/announcements" size="small" sx={{ textTransform: 'none', fontWeight: 700 }}>
            See all
          </Button>
        }
      >
        {loading ? (
          <Loader label="Loading announcements" />
        ) : dashboard.announcements.length === 0 ? (
          <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
            <EmptyRow text="No announcements yet." />
          </Paper>
        ) : (
          <Stack spacing={2}>
            {dashboard.announcements.slice(0, 3).map((announcement) => (
              <AnnouncementPost key={announcement.id} announcement={announcement} />
            ))}
          </Stack>
        )}
      </SectionPanel>
    </Box>
  );
}

export default StudentOverview;
