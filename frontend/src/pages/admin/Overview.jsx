import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarRange,
  DoorOpen,
  GraduationCap,
  Layers,
  Megaphone,
  Presentation,
  ShieldCheck,
  Users,
  Users2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard } from '../../services/adminApi';
import { extractErrorMessage } from '../../services/api';
import { AQUA_GRADIENT } from '../../theme';

// Order mirrors ADMIN_NAV's grouping (users, academic, schedule, class),
// with the counts endpoint's key on the left and the matching route on the
// right — academic-years and grade-levels are hyphenated in App.jsx.
const CARDS = [
  { key: 'students', label: 'Students', to: '/admin/students', Icon: GraduationCap },
  { key: 'teachers', label: 'Teachers', to: '/admin/teachers', Icon: Presentation },
  { key: 'parents', label: 'Parents', to: '/admin/parents', Icon: Users },
  { key: 'admins', label: 'Admins', to: '/admin/admins', Icon: ShieldCheck },
  { key: 'academic_years', label: 'School Years', to: '/admin/academic-years', Icon: CalendarRange },
  { key: 'grade_levels', label: 'Grade Levels', to: '/admin/grade-levels', Icon: Layers },
  { key: 'sections', label: 'Sections', to: '/admin/sections', Icon: DoorOpen },
  { key: 'subjects', label: 'Subjects', to: '/admin/subjects', Icon: BookOpen },
  { key: 'schedules', label: 'Schedules', to: '/admin/schedules', Icon: CalendarClock },
  { key: 'classes', label: 'Classes', to: '/admin/classes', Icon: Users2 },
  { key: 'announcements', label: 'Announcements', to: '/admin/announcements', Icon: Megaphone },
];

const AUDIENCE_LABELS = {
  all: 'Everyone',
  students: 'Students',
  teachers: 'Teachers',
  parents: 'Parents',
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }

  // Plain YYYY-MM-DD school-year boundaries — parsing as UTC midnight would
  // render a day early anywhere west of Greenwich, so build in local time.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

function CountCard({ label, to, Icon, value, loading }) {
  return (
    <Paper
      component={RouterLink}
      to={to}
      elevation={0}
      sx={{
        display: 'block',
        textDecoration: 'none',
        borderRadius: 4,
        border: '1px solid rgba(22,59,56,0.08)',
        backgroundColor: '#FFFFFF',
        p: 3,
        transition: 'transform 240ms ease, box-shadow 240ms ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 20px 44px rgba(22,59,56,0.10)',
        },
      }}
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

        <Box aria-hidden="true" sx={{ ml: 'auto', color: 'primary.dark', display: 'flex', flexShrink: 0 }}>
          <ArrowRight size={19} />
        </Box>
      </Stack>
    </Paper>
  );
}

function Overview() {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchDashboard()
      .then((data) => {
        if (!cancelled) {
          setDashboard(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load the overview.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const counts = dashboard?.counts || null;
  const activeYear = dashboard?.active_academic_year;
  const announcements = dashboard?.recent_announcements || [];

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}.
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        Manage the people, academics, and communications on record at Sacred Heart Academy.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      {/* dashboard === null distinguishes "still loading/errored" from
          "loaded with active_academic_year: null", a real, expected state. */}
      {dashboard !== null ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: 4,
            border: '1px solid rgba(22,59,56,0.08)',
            backgroundColor: activeYear ? '#FFFFFF' : 'rgba(211,90,70,0.06)',
            p: 3,
            mb: 4,
          }}
        >
          {activeYear ? (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
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
                <CalendarRange size={23} strokeWidth={2} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  Active school year
                </Typography>
                <Typography sx={{ fontWeight: 800, fontSize: '1.25rem' }}>{activeYear.name}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {formatDate(activeYear.start_date)} – {formatDate(activeYear.end_date)}
                </Typography>
              </Box>
            </Stack>
          ) : (
            <Box>
              <Typography sx={{ fontWeight: 800, color: '#9C3B2A' }}>No active school year</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Enrolment and scheduling depend on a school year marked active. Set one from{' '}
                <RouterLink to="/admin/academic-years" style={{ color: 'inherit', fontWeight: 700 }}>
                  School Years
                </RouterLink>
                .
              </Typography>
            </Box>
          )}
        </Paper>
      ) : null}

      <Grid container spacing={3}>
        {CARDS.map(({ key, label, to, Icon }) => (
          <Grid key={key} size={{ xs: 12, sm: 6, lg: 4 }}>
            <CountCard label={label} to={to} Icon={Icon} value={counts?.[key]} loading={counts === null && !error} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Typography variant="h5">Recent announcements</Typography>
          <Typography
            component={RouterLink}
            to="/admin/announcements"
            variant="body2"
            sx={{ color: 'primary.dark', fontWeight: 700, textDecoration: 'none' }}
          >
            View all
          </Typography>
        </Stack>

        <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(22,59,56,0.08)', backgroundColor: '#FFFFFF' }}>
          {counts === null && !error ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
              <CircularProgress size={26} aria-label="Loading announcements" />
            </Box>
          ) : announcements.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography sx={{ color: 'text.secondary' }}>No announcements posted yet.</Typography>
            </Box>
          ) : (
            <Stack divider={<Box sx={{ borderBottom: '1px solid rgba(22,59,56,0.08)' }} />}>
              {announcements.map((announcement) => (
                <Box
                  key={announcement.id}
                  component={RouterLink}
                  to="/admin/announcements"
                  sx={{
                    display: 'block',
                    textDecoration: 'none',
                    color: 'inherit',
                    p: 2.5,
                    '&:hover': { backgroundColor: 'background.paper' },
                  }}
                >
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ sm: 'center' }}
                    justifyContent="space-between"
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700 }} noWrap>
                        {announcement.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                        {announcement.author_name} · {formatDate(announcement.created_at)}
                      </Typography>
                    </Box>
                    <Chip
                      label={AUDIENCE_LABELS[announcement.target_role] || announcement.target_role}
                      size="small"
                      sx={{ backgroundColor: 'primary.light', color: 'primary.dark', fontWeight: 700, flexShrink: 0 }}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </Paper>
      </Box>
    </Box>
  );
}

export default Overview;
