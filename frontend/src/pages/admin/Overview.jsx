import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ArrowRight, GraduationCap, Presentation, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchCounts } from '../../services/adminApi';
import { extractErrorMessage } from '../../services/api';
import { AQUA_GRADIENT } from '../../theme';

const CARDS = [
  { key: 'students', label: 'Students', to: '/admin/students', Icon: GraduationCap },
  { key: 'teachers', label: 'Teachers', to: '/admin/teachers', Icon: Presentation },
  { key: 'parents', label: 'Parents', to: '/admin/parents', Icon: Users },
];

function Overview() {
  const { profile } = useAuth();
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchCounts()
      .then((data) => {
        if (!cancelled) {
          setCounts(data);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load the overview counts.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}.
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        Manage the people on record at Sacred Heart Academy.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {CARDS.map(({ key, label, to, Icon }) => {
          const value = counts?.[key];

          return (
            <Grid key={key} size={{ xs: 12, sm: 6, lg: 4 }}>
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

                    {counts === null && !error ? (
                      <CircularProgress size={20} sx={{ mt: 1 }} aria-label={`Loading ${label}`} />
                    ) : (
                      <Typography
                        sx={{
                          fontWeight: 800,
                          fontSize: '2rem',
                          lineHeight: 1.15,
                          color: 'primary.main',
                        }}
                      >
                        {value === null || value === undefined ? '—' : value}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    aria-hidden="true"
                    sx={{ ml: 'auto', color: 'primary.dark', display: 'flex', flexShrink: 0 }}
                  >
                    <ArrowRight size={19} />
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}

export default Overview;
