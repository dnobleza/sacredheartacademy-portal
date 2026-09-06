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
import { BarChart } from '@mui/x-charts/BarChart';
import {
  ArrowRight,
  CalendarRange,
  ClipboardList,
  DoorOpen,
  GraduationCap,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchRegistrarDashboard } from '../../services/registrarApi';
import { extractErrorMessage } from '../../services/api';
import AnnouncementPost, { formatDate } from '../../components/common/AnnouncementPost';
import { AQUA, AQUA_GRADIENT, CARD_RADIUS, TILE_RADIUS } from '../../theme';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

// Cards lead to the two screens a registrar owns. Student, section, grade and
// school-year records are Super Admin only, so their counts are read-only here.
const CARDS = [
  { key: 'students', label: 'Students', to: '/registrar/enrollment', Icon: GraduationCap },
  { key: 'enrolled_this_year', label: 'Enrolled This Year', to: '/registrar/enrollment', Icon: UserPlus },
  { key: 'pending_admissions', label: 'Pending Admissions', to: '/registrar/admissions', Icon: ClipboardList },
  { key: 'sections', label: 'Sections', to: '/registrar/enrollment', Icon: DoorOpen },
];

// Mirrors the status enum on admission_applications.
const ADMISSION_STATUS_COLOR = {
  pending: 'default',
  reviewing: 'info',
  accepted: 'success',
  rejected: 'error',
  enrolled: 'primary',
};

const fullName = (person) => [person.first_name, person.last_name].filter(Boolean).join(' ').trim();

// Section names repeat across grade levels, so never show one on its own.
const sectionLabel = (row) => `${row.grade_level_name} ${row.section_name}`;

function CountCard({ label, to, Icon, value, loading }) {
  return (
    <Paper
      component={RouterLink}
      to={to}
      elevation={0}
      sx={{
        display: 'block',
        textDecoration: 'none',
        borderRadius: CARD_RADIUS,
        border: CARD_BORDER,
        backgroundColor: '#FFFFFF',
        p: 3,
        height: '100%',
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
            borderRadius: TILE_RADIUS,
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

function SectionPanel({ title, action, children }) {
  return (
    <Box sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5">{title}</Typography>
        {action}
      </Stack>
      {children}
    </Box>
  );
}

function PanelLink({ to, children }) {
  return (
    <Typography
      component={RouterLink}
      to={to}
      variant="body2"
      sx={{ color: 'primary.dark', fontWeight: 700, textDecoration: 'none' }}
    >
      {children}
    </Typography>
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

function RegistrarOverview() {
  const { profile } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchRegistrarDashboard()
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

  const loading = dashboard === null && !error;
  const counts = dashboard?.counts || null;
  const activeYear = dashboard?.active_academic_year;
  const enrollees = dashboard?.enrollees_by_grade_level || [];
  const sections = dashboard?.sections_summary || [];
  const unassigned = dashboard?.unassigned_students || [];
  const admissions = dashboard?.recent_admissions || [];
  const announcements = dashboard?.recent_announcements || [];

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}.
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        Track admissions, enrolment, and student records for Sacred Heart Academy.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {/* dashboard === null distinguishes "still loading/errored" from
          "loaded with active_academic_year: null", a real, expected state. */}
      {dashboard !== null ? (
        <Paper
          elevation={0}
          sx={{
            borderRadius: CARD_RADIUS,
            border: CARD_BORDER,
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
                  borderRadius: TILE_RADIUS,
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
                Enrolment depends on a school year marked active. Ask a Super Admin to set one.
              </Typography>
            </Box>
          )}
        </Paper>
      ) : null}

      <Grid container spacing={3}>
        {CARDS.map(({ key, label, to, Icon }) => (
          <Grid key={key} size={{ xs: 12, sm: 6, lg: 3 }}>
            <CountCard label={label} to={to} Icon={Icon} value={counts?.[key]} loading={loading} />
          </Grid>
        ))}
      </Grid>

      <SectionPanel title="Enrollees per grade level">
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}>
          {loading ? (
            <Loader label="Loading enrollment chart" />
          ) : !activeYear ? (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Enrolment counts follow the active school year. Ask a Super Admin to set one.
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
      </SectionPanel>

      <SectionPanel title="Recent Applications" action={<PanelLink to="/registrar/admissions">View all</PanelLink>}>
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          {loading ? (
            <Loader label="Loading applications" />
          ) : admissions.length === 0 ? (
            <EmptyRow text="No admission applications submitted yet." />
          ) : (
            <Stack divider={<Box sx={{ borderBottom: CARD_BORDER }} />}>
              {admissions.map((row) => (
                <Stack
                  key={row.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  sx={{ p: 2.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{fullName(row) || row.reference_number}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {row.reference_number}
                      {row.grade_level_name ? ` · ${row.grade_level_name}` : ''} ·{' '}
                      {formatDate(row.created_at)}
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={row.status}
                    color={ADMISSION_STATUS_COLOR[row.status] || 'default'}
                    sx={{ ml: { sm: 'auto' }, textTransform: 'capitalize', fontWeight: 700, flexShrink: 0 }}
                  />
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </SectionPanel>

      <SectionPanel title="Sections">
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          {loading ? (
            <Loader label="Loading sections" />
          ) : sections.length === 0 ? (
            <EmptyRow text="No sections created yet." />
          ) : (
            <Stack divider={<Box sx={{ borderBottom: CARD_BORDER }} />}>
              {sections.map((row) => (
                <Stack
                  key={row.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  sx={{ p: 2.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{sectionLabel(row)}</Typography>
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

      <SectionPanel title="Not Enrolled This Year" action={<PanelLink to="/registrar/enrollment">Place students</PanelLink>}>
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
          {loading ? (
            <Loader label="Loading students" />
          ) : !activeYear ? (
            <EmptyRow text="Set an active school year to see who still needs a section." />
          ) : unassigned.length === 0 ? (
            <EmptyRow text="Every student on record has an active enrollment." />
          ) : (
            <Stack divider={<Box sx={{ borderBottom: CARD_BORDER }} />}>
              {unassigned.map((student) => (
                <Stack
                  key={student.id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.5}
                  alignItems={{ sm: 'center' }}
                  sx={{ p: 2.5, backgroundColor: 'rgba(211,90,70,0.06)' }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{fullName(student) || student.email}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {student.email}
                    </Typography>
                  </Box>

                  <Typography variant="body2" sx={{ color: 'text.secondary', ml: { sm: 'auto' } }}>
                    No section assigned
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Paper>
      </SectionPanel>

      <SectionPanel title="Records Requests">
        <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 4 }}>
          <Typography sx={{ fontWeight: 700 }}>Not available yet</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Document and transcript requests are still being built. Nothing is tracked here yet, so
            this panel stays empty rather than showing placeholder figures.
          </Typography>
        </Paper>
      </SectionPanel>

      <SectionPanel
        title="Recent Announcements"
        action={<PanelLink to="/registrar/announcements">View all</PanelLink>}
      >
        {loading ? (
          <Loader label="Loading announcements" />
        ) : announcements.length === 0 ? (
          <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}>
            <EmptyRow text="No announcements posted yet." />
          </Paper>
        ) : (
          <Stack spacing={3} sx={{ maxWidth: 680 }}>
            {announcements.map((announcement) => (
              <AnnouncementPost
                key={announcement.id}
                announcement={announcement}
                manageTo="/registrar/announcements"
              />
            ))}
          </Stack>
        )}
      </SectionPanel>
    </Box>
  );
}

export default RegistrarOverview;
