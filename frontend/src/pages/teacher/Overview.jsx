import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Users2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchTeacherDashboard } from '../../services/teacherApi';
import { extractErrorMessage } from '../../services/api';
import AnnouncementPost from '../../components/common/AnnouncementPost';
import { AQUA_GRADIENT } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const greeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  return hour < 18 ? 'Good afternoon' : 'Good evening';
};

// Section names repeat across grade levels, so never show one on its own.
const classLabel = (row) => `${row.grade_level_name} ${row.section_name}`;

function StatCard({ label, value, Icon, loading }) {
  return (
    <Paper
      elevation={0}
      sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3, height: '100%' }}
    >
      <Stack direction="row" alignItems="center" spacing={2}>
        <Box
          aria-hidden="true"
          sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            background: AQUA_GRADIENT,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={23} strokeWidth={2} />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            {label}
          </Typography>

          {loading ? (
            <CircularProgress size={20} sx={{ mt: 1 }} aria-label={`Loading ${label}`} />
          ) : (
            <Typography sx={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1.15, color: 'primary.main' }}>
              {value === null || value === undefined ? '—' : value}
            </Typography>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function SectionPanel({ title, children }) {
  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function EmptyRow({ text }) {
  return (
    <Box sx={{ py: 5, textAlign: 'center' }}>
      <Typography sx={{ color: 'text.secondary' }}>{text}</Typography>
    </Box>
  );
}

function Loader({ label }) {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
      <CircularProgress size={26} aria-label={label} />
    </Box>
  );
}

function TeacherOverview() {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchTeacherDashboard()
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
  const counts = dashboard?.counts;
  const activeYear = dashboard?.active_academic_year;
  const advisory = dashboard?.advisory_classes || [];
  const attendance = dashboard?.attendance_today || [];
  const tasks = dashboard?.pending_tasks || [];
  const announcements = dashboard?.recent_announcements || [];

  const attendanceRate =
    counts?.attendance_rate === null || counts?.attendance_rate === undefined
      ? null
      : `${counts.attendance_rate}%`;

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        {greeting()}
        {profile?.last_name ? `, ${profile.last_name}` : ''}.
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        Here is what is happening with your classes today.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* Loaded with no active year is a real state, not a load failure — every
          class, schedule and grade hangs off the active school year. */}
      {dashboard !== null && !activeYear ? (
        <Paper
          elevation={0}
          sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: 'rgba(211,90,70,0.06)', p: 3, mb: 4 }}
        >
          <Typography sx={{ fontWeight: 800, color: '#9C3B2A' }}>No active school year</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Classes, schedules, and grades follow the school year an administrator marks active.
            Nothing can be shown until one is set.
          </Typography>
        </Paper>
      ) : null}

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="My Classes" value={counts?.classes} Icon={Users2} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Students" value={counts?.students} Icon={GraduationCap} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Attendance" value={attendanceRate} Icon={ClipboardCheck} loading={loading} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard label="Pending Grades" value={counts?.pending_grades} Icon={ClipboardList} loading={loading} />
        </Grid>
      </Grid>

      <SectionPanel title="My Advisory Class">
        <Paper elevation={0} sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <Loader label="Loading advisory classes" />
          ) : advisory.length === 0 ? (
            <EmptyRow text="You are not assigned as an adviser this school year." />
          ) : (
            <Stack divider={<Box sx={{ borderBottom: CARD_BORDER }} />}>
              {advisory.map((row) => (
                <Stack
                  key={row.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  sx={{ p: 2.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{classLabel(row)}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {row.room || 'No room set'}
                    </Typography>
                  </Box>

                  <Typography variant="body2" sx={{ color: 'text.secondary', ml: { sm: 'auto' } }}>
                    {row.student_count} enrolled
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </SectionPanel>

      <SectionPanel title="Attendance">
        <Paper elevation={0} sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
          {loading ? (
            <Loader label="Loading attendance" />
          ) : attendance.length === 0 ? (
            <EmptyRow text="No subject classes yet. These appear once an administrator schedules a subject for you." />
          ) : (
            <Stack divider={<Box sx={{ borderBottom: CARD_BORDER }} />}>
              {attendance.map((row) => (
                <Stack
                  key={row.class_subject_id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  sx={{ p: 2.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{classLabel(row)}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {row.subject_name}
                    </Typography>
                  </Box>

                  {/* taken separates "nobody present" from "not recorded yet". */}
                  <Typography variant="body2" sx={{ color: 'text.secondary', ml: { sm: 'auto' } }}>
                    {row.taken
                      ? `${row.present_count} / ${row.roster_count} present`
                      : `Not taken yet · ${row.roster_count} enrolled`}
                  </Typography>

                  <Button
                    component={RouterLink}
                    to="/teacher/attendance"
                    variant="outlined"
                    size="small"
                    sx={{ flexShrink: 0, borderRadius: 2, fontWeight: 700 }}
                  >
                    Take Attendance
                  </Button>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </SectionPanel>

      <SectionPanel title="Pending Tasks">
        <Paper elevation={0} sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          {loading ? (
            <Loader label="Loading tasks" />
          ) : tasks.length === 0 ? (
            <EmptyRow text="Nothing outstanding." />
          ) : (
            <Stack divider={<Box sx={{ borderBottom: CARD_BORDER }} />}>
              {tasks.map((task) => (
                <Stack
                  key={`${task.type}-${task.class_subject_id}`}
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  sx={{ p: 2.5, backgroundColor: task.done ? 'transparent' : 'rgba(211,90,70,0.06)' }}
                >
                  <Box
                    aria-hidden="true"
                    sx={{ color: task.done ? 'primary.dark' : '#9C3B2A', display: 'flex', flexShrink: 0 }}
                  >
                    {task.done ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{task.label}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {task.detail}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </SectionPanel>

      <SectionPanel title="Recent Announcements">
        {loading ? (
          <Loader label="Loading announcements" />
        ) : announcements.length === 0 ? (
          <Paper elevation={0} sx={{ borderRadius: 4, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
            <EmptyRow text="No announcements posted yet." />
          </Paper>
        ) : (
          <Stack spacing={3} sx={{ maxWidth: 680 }}>
            {announcements.map((announcement) => (
              <AnnouncementPost key={announcement.id} announcement={announcement} />
            ))}
          </Stack>
        )}
      </SectionPanel>
    </Box>
  );
}

export default TeacherOverview;
