import { useState } from 'react';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Pencil } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import ProfileEditDialog from '../../components/common/ProfileEditDialog';
import useImageObjectUrl from '../../hooks/useImageObjectUrl';
import { useAuth } from '../../context/AuthContext';
import { updateMyProfile } from '../../services/profileApi';
import { extractErrorMessage } from '../../services/api';
import { roleLabel } from '../../utils/roles';
import { AQUA_GRADIENT, CARD_RADIUS } from '../../theme';

const DASH = '—';

const displayValue = (value) => (value === null || value === undefined || value === '' ? DASH : value);

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

function ParentProfile() {
  const { user, profile, refreshProfile } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const photoUrl = useImageObjectUrl(profile?.photo_id);

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
    .filter(Boolean)
    .join(' ');

  const handleSubmit = async (payload) => {
    setFormError('');

    try {
      await updateMyProfile(payload);
      await refreshProfile();
      setFormOpen(false);
      setToast('Profile updated.');
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Could not save your profile. Please try again.'));
    }
  };

  return (
    <DashboardLayout
      title="My profile"
      description="Your details on record at Sacred Heart Academy."
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: CARD_RADIUS,
              border: '1px solid rgba(22,59,56,0.08)',
              backgroundColor: '#FFFFFF',
              p: 4,
              textAlign: 'center',
              height: '100%',
            }}
          >
            <Avatar
              src={photoUrl || undefined}
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
              onClick={() => {
                setFormError('');
                setFormOpen(true);
              }}
              disabled={!profile}
              startIcon={<Pencil size={16} />}
              variant="outlined"
              sx={{ mt: 3, borderRadius: CARD_RADIUS, textTransform: 'none', fontWeight: 700 }}
            >
              Edit profile
            </Button>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: CARD_RADIUS,
              border: '1px solid rgba(22,59,56,0.08)',
              backgroundColor: '#FFFFFF',
              p: 4,
              height: '100%',
            }}
          >
            <Typography sx={{ fontWeight: 800, mb: 1 }}>Details</Typography>
            <Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />

            <Stack divider={<Divider sx={{ borderColor: 'rgba(22,59,56,0.08)' }} />}>
              <DetailRow label="Mobile number" value={profile?.contact_number} />
              <DetailRow label="Gender" value={profile?.gender} />
              <DetailRow label="Address" value={profile?.address} />
            </Stack>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 3 }}>
              Your name, email and account status are managed by the school administrator.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <ProfileEditDialog
        open={formOpen}
        profile={profile}
        submitError={formError}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast('')}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </DashboardLayout>
  );
}

export default ParentProfile;
