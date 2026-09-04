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
import { useAuth } from '../../context/AuthContext';
import { roleLabel } from '../../utils/roles';
import { AQUA_GRADIENT } from '../../theme';
import ResourceFormDialog from '../../components/admin/ResourceFormDialog';
import { updateResource } from '../../services/adminApi';
import { extractErrorMessage } from '../../services/api';
import { ADMIN_RESOURCES } from '../../data/adminResources';

const DASH = '—';

// A self-edit form for the signed-in admin's own record. Reuses the same
// field config as the Admins resource, minus `status` and `access_level_id` —
// an admin must never be able to deactivate or demote their own account and
// lock themselves out. The backend rejects both on its own; dropping the
// fields here just keeps the form from offering something that will fail.
const SELF_EDIT_EXCLUDED = ['status', 'access_level_id'];

const PROFILE_RESOURCE = {
  ...ADMIN_RESOURCES.admins,
  singular: 'profile',
  fields: ADMIN_RESOURCES.admins.fields.filter(
    (field) => !SELF_EDIT_EXCLUDED.includes(field.name),
  ),
};

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
  const { user, profile, refreshProfile } = useAuth();

  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
    .filter(Boolean)
    .join(' ');

  const accessLevel = user?.access_level;

  const details = [
    { label: 'Employee number', value: profile?.employee_number },
    {
      label: 'Access level',
      value: accessLevel ? `${accessLevel.code} — ${accessLevel.name}` : null,
    },
    { label: 'Mobile number', value: profile?.contact_number },
    { label: 'Gender', value: profile?.gender },
    { label: 'Address', value: profile?.address },
  ];

  const openEdit = () => {
    setFormError('');
    setFormOpen(true);
  };

  const handleSubmit = async (payload) => {
    setFormError('');

    try {
      await updateResource('admins', profile.id, payload);
      await refreshProfile();
      setFormOpen(false);
      setToast('Profile updated.');
    } catch (error) {
      setFormError(extractErrorMessage(error, 'Could not save your profile. Please try again.'));
    }
  };

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
              onClick={openEdit}
              disabled={!profile}
              startIcon={<Pencil size={16} />}
              sx={{ mt: 3, borderRadius: 3, textTransform: 'none', fontWeight: 700 }}
              variant="outlined"
            >
              Edit profile
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

      <ResourceFormDialog
        open={formOpen}
        resource={PROFILE_RESOURCE}
        // Email lives on the user row, not the admins profile row, so it has
        // to be merged in — otherwise the required field opens blank and
        // blocks saving until the admin retypes their own address.
        record={profile ? { ...profile, email: user?.email || '' } : null}
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
    </Box>
  );
}

export default Profile;
