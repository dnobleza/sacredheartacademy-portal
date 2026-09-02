import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { AQUA_GRADIENT } from '../../theme';

const DASH = '—';

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return DASH;
  return value;
};

const initials = (first, last) => {
  const letters = [first, last].filter(Boolean).map((part) => part[0].toUpperCase());
  return letters.length ? letters.join('') : '?';
};

function DetailRow({ label, value }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ py: 1.25 }}>
      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 600, textAlign: 'right' }}>{displayValue(value)}</Typography>
    </Stack>
  );
}

function Profile() {
  const { user, profile } = useAuth();

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
    .filter(Boolean)
    .join(' ');

  const details = [
    { label: 'Employee number', value: profile?.employee_number },
    { label: 'Mobile number', value: profile?.contact_number },
    { label: 'Gender', value: profile?.gender },
    { label: 'Address', value: profile?.address },
  ];

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        Profile
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mt: 1, mb: 4, maxWidth: 620 }}>
        Your account details on record at Sacred Heart Academy.
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid rgba(22,59,56,0.08)',
              backgroundColor: '#FFFFFF',
              p: 4,
              textAlign: 'center',
              height: '100%',
            }}
          >
            <Avatar
              sx={{
                width: 96,
                height: 96,
                mx: 'auto',
                mb: 2,
                background: AQUA_GRADIENT,
                fontSize: '2rem',
                fontWeight: 800,
              }}
            >
              {initials(profile?.first_name, profile?.last_name)}
            </Avatar>

            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem' }}>
              {fullName || DASH}
            </Typography>

            <Chip
              label={roleLabel(user?.role)}
              size="small"
              sx={{
                mt: 1.5,
                backgroundColor: 'primary.light',
                color: 'primary.dark',
                fontWeight: 700,
              }}
            />

            <Typography sx={{ mt: 2, color: 'text.secondary' }}>
              {displayValue(user?.email)}
            </Typography>

            <Button
              disabled
              startIcon={<Pencil size={16} />}
              sx={{ mt: 3, borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
              variant="outlined"
            >
              Edit profile (coming soon)
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              border: '1px solid rgba(22,59,56,0.08)',
              backgroundColor: '#FFFFFF',
              p: 4,
              height: '100%',
            }}
          >
            <Typography sx={{ fontWeight: 800, mb: 1 }}>Details</Typography>
            <Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />

            <Stack divider={<Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />}>
              {details.map((detail) => (
                <DetailRow key={detail.label} label={detail.label} value={detail.value} />
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Profile;
