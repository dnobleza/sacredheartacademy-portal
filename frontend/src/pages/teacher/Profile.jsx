import { useEffect, useState } from 'react';
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
import { fetchImageObjectUrl } from '../../services/imagesApi';
import { roleLabel } from '../../utils/roles';
import { AQUA_GRADIENT } from '../../theme';
import ResourceFormDialog from '../../components/admin/ResourceFormDialog';
import { updateTeacherProfile } from '../../services/teacherApi';
import { extractErrorMessage } from '../../services/api';
import { ADMIN_RESOURCES } from '../../data/adminResources';

const DASH = '—';

// A self-edit form for the signed-in teacher. Reuses the Teachers field config
// minus the fields the server refuses from a teacher: email and status are
// account controls, and employee_number identifies the staff record. Dropping
// them here just keeps the form from offering what would be rejected.
const SELF_EDIT_EXCLUDED = ['email', 'status', 'employee_number'];

const PROFILE_RESOURCE = {
  ...ADMIN_RESOURCES.teachers,
  singular: 'profile',
  fields: ADMIN_RESOURCES.teachers.fields.filter(
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

function TeacherProfile() {
  const { user, profile, refreshProfile } = useAuth();

  const [photoUrl, setPhotoUrl] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  // The images endpoint is authenticated, so the photo is fetched as a blob
  // rather than pointed at with <img src>. The object URL is revoked when the
  // photo changes or the page unmounts.
  useEffect(() => {
    const photoId = profile?.photo_id;

    if (!photoId) {
      setPhotoUrl(null);
      return undefined;
    }

    let active = true;
    let created = null;

    fetchImageObjectUrl(photoId)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }

        created = url;
        setPhotoUrl(url);
      })
      .catch(() => {
        // Fall back to initials rather than breaking the page.
        if (active) {
          setPhotoUrl(null);
        }
      });

    return () => {
      active = false;

      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [profile?.photo_id]);

  const fullName = [profile?.first_name, profile?.middle_name, profile?.last_name]
    .filter(Boolean)
    .join(' ');

  const details = [
    { label: 'Employee number', value: profile?.employee_number },
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
      await updateTeacherProfile(payload);
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

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 3 }}>
              Your email, employee number, and account status are managed by the school
              administrator.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <ResourceFormDialog
        open={formOpen}
        resource={PROFILE_RESOURCE}
        record={profile}
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

export default TeacherProfile;
