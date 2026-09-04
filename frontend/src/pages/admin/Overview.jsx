import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  ArrowRight,
  CalendarRange,
  GraduationCap,
  Presentation,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchDashboard } from '../../services/adminApi';
import { extractErrorMessage } from '../../services/api';
import AnnouncementPost, { formatDate } from '../../components/common/AnnouncementPost';
import { AQUA, AQUA_GRADIENT } from '../../theme';

// People only. The academic and scheduling resources keep their own pages,
// reached from the sidebar, so they no longer take up dashboard space.
// peopleKey names the dashboard field holding that card's recent registrations.
const CARDS = [
  { key: 'students', label: 'Students', to: '/admin/students', Icon: GraduationCap, peopleKey: 'recent_students' },
  { key: 'teachers', label: 'Teachers', to: '/admin/teachers', Icon: Presentation, peopleKey: 'recent_teachers' },
  { key: 'parents', label: 'Parents', to: '/admin/parents', Icon: Users, peopleKey: 'recent_parents' },
  { key: 'admins', label: 'Admins', to: '/admin/admins', Icon: ShieldCheck, peopleKey: 'recent_admins' },
];

const fullName = (person) => [person.first_name, person.last_name].filter(Boolean).join(' ').trim();

// Profile photos live behind the authenticated /images/:id endpoint and have
// to be fetched as blobs, so the dashboard uses initials rather than firing a
// request per person.
const initials = (person) =>
  [person.first_name, person.last_name]
    .filter(Boolean)
    .map((part) => part.trim()[0])
    .join('')
    .toUpperCase() || '?';

function RecentPeople({ people }) {
  return (
    <Box sx={{ mt: 2.5, pt: 2, borderTop: '1px solid rgba(22,59,56,0.08)' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700, mb: 1.5 }}>
        Recently registered
      </Typography>

      {people.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No one registered yet.
        </Typography>
      ) : (
        <Stack spacing={1.25}>
          {people.map((person) => (
            <Stack key={person.id} direction="row" alignItems="center" spacing={1.5}>
              <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700, background: AQUA_GRADIENT }}>
                {initials(person)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {fullName(person) || person.email}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatDate(person.created_at)}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Box>
  );
}

function CountCard({ label, to, Icon, value, loading, people }) {
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

      {people ? <RecentPeople people={people} /> : null}
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
  const enrollees = dashboard?.enrollees_by_grade_level || [];

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
        {CARDS.map(({ key, label, to, Icon, peopleKey }) => (
          <Grid key={key} size={{ xs: 12, sm: 6, lg: 3 }}>
            <CountCard
              label={label}
              to={to}
              Icon={Icon}
              value={counts?.[key]}
              loading={counts === null && !error}
              people={peopleKey && dashboard ? dashboard[peopleKey] || [] : undefined}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Enrollees per grade level
        </Typography>

        <Paper
          elevation={0}
          sx={{ borderRadius: 4, border: '1px solid rgba(22,59,56,0.08)', backgroundColor: '#FFFFFF', p: 3 }}
        >
          {dashboard === null && !error ? (
            <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
              <CircularProgress size={26} aria-label="Loading enrollment chart" />
            </Box>
          ) : !activeYear ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Enrolment counts follow the active school year. Set one from{' '}
              <RouterLink to="/admin/academic-years" style={{ color: 'inherit', fontWeight: 700 }}>
                School Years
              </RouterLink>
              .
            </Typography>
          ) : enrollees.length === 0 ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              No active enrollments yet.
            </Typography>
          ) : (
            <BarChart
              height={320}
              xAxis={[
                {
                  scaleType: 'band',
                  data: enrollees.map((row) => row.name),
                  tickLabelStyle: { fontSize: 12, angle: -25, textAnchor: 'end' },
                },
              ]}
              series={[
                {
                  data: enrollees.map((row) => Number(row.total)),
                  label: `Active enrollees · ${activeYear.name}`,
                  color: AQUA.dark,
                },
              ]}
              margin={{ bottom: 70 }}
            />
          )}
        </Paper>
      </Box>

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

        {counts === null && !error ? (
          <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}>
            <CircularProgress size={26} aria-label="Loading announcements" />
          </Box>
        ) : announcements.length === 0 ? (
          <Paper
            elevation={0}
            sx={{ borderRadius: 4, border: '1px solid rgba(22,59,56,0.08)', backgroundColor: '#FFFFFF', py: 6, textAlign: 'center' }}
          >
            <Typography sx={{ color: 'text.secondary' }}>No announcements posted yet.</Typography>
          </Paper>
        ) : (
          <Stack spacing={3} sx={{ maxWidth: 680 }}>
            {announcements.map((announcement) => (
              <AnnouncementPost key={announcement.id} announcement={announcement} manageTo="/admin/announcements" />
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}

export default Overview;
