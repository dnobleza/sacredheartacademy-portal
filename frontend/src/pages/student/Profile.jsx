import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Pencil } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchStudentProfile } from '../../services/studentApi';
import { updateMyProfile } from '../../services/profileApi';
import ProfileEditDialog from '../../components/common/ProfileEditDialog';
import { extractErrorMessage } from '../../services/api';
import { EmptyRow, Loader } from '../../components/student/Feedback';
import useImageObjectUrl from '../../hooks/useImageObjectUrl';
import { CARD_RADIUS } from '../../theme';
import { formatDate } from '../../utils/format';

const CARD_BORDER = '1px solid rgba(22,59,56,0.08)';

const fullName = (person) =>
  [person?.first_name, person?.middle_name, person?.last_name].filter(Boolean).join(' ').trim();

function Field({ label, value }) {
  if (!value) {
    return null;
  }

  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600 }}>{value}</Typography>
    </Box>
  );
}

function StudentProfile() {
  const { refreshProfile } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');
  const photoUrl = useImageObjectUrl(data?.student?.photo_id);

  const load = () =>
    fetchStudentProfile()
      .then(setData)
      .catch((requestError) =>
        setError(extractErrorMessage(requestError, 'Could not load your profile.')),
      );

  // The header avatar and the sidebar both read from AuthContext, so the
  // saved photo has to reach it as well as this page's own copy.
  const handleSubmit = async (payload) => {
    setFormError('');

    try {
      await updateMyProfile(payload);
      await Promise.all([load(), refreshProfile()]);
      setFormOpen(false);
      setToast('Profile updated.');
    } catch (requestError) {
      setFormError(
        extractErrorMessage(requestError, 'Could not save your profile. Please try again.'),
      );
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetchStudentProfile()
      .then((result) => {
        if (!cancelled) {
          setData(result);
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(extractErrorMessage(requestError, 'Could not load your profile.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const loading = data === null && !error;
  const student = data?.student;

  return (
    <Box>
      <Typography variant="h2" component="h1" sx={{ fontSize: { xs: '1.6rem', md: '2rem' } }}>
        My Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: CARD_RADIUS }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader label="Loading your profile" />
      ) : (
        <Stack spacing={3} sx={{ mt: 3 }}>
          <Paper
            elevation={0}
            sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF', p: 3 }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
              <Avatar src={photoUrl || undefined} sx={{ width: 84, height: 84, fontSize: '1.8rem' }}>
                {student?.first_name?.[0] || 'S'}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5">{fullName(student)}</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {student?.email}
                </Typography>

                {data.section_name && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    {data.grade_level_name} - {data.section_name}
                    {data.active_academic_year ? ` · ${data.active_academic_year.name}` : ''}
                  </Typography>
                )}
              </Box>

              <Button
                onClick={() => {
                  setFormError('');
                  setFormOpen(true);
                }}
                startIcon={<Pencil size={16} />}
                variant="outlined"
                sx={{ ml: { sm: 'auto' }, borderRadius: CARD_RADIUS, textTransform: 'none', fontWeight: 700 }}
              >
                Edit profile
              </Button>
            </Stack>

            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Field label="Student No" value={student?.student_number} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Field label="Birth date" value={student?.birth_date && formatDate(student.birth_date)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Field label="Gender" value={student?.gender} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Field label="Contact number" value={student?.contact_number} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Field label="Adviser" value={data.adviser?.name} />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Field label="Address" value={student?.address} />
              </Grid>
            </Grid>
          </Paper>

          <Box>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Parents and guardians
            </Typography>

            <Paper
              elevation={0}
              sx={{ borderRadius: CARD_RADIUS, border: CARD_BORDER, backgroundColor: '#FFFFFF' }}
            >
              {data.guardians.length === 0 ? (
                <EmptyRow text="No parent or guardian is linked to your record yet." />
              ) : (
                data.guardians.map((guardian, index) => (
                  <Stack
                    key={guardian.id}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 0.5, sm: 2 }}
                    alignItems={{ sm: 'center' }}
                    sx={{ px: 3, py: 2, borderTop: index === 0 ? 'none' : CARD_BORDER }}
                  >
                    <Typography sx={{ fontWeight: 600, flex: 1 }}>{guardian.name}</Typography>
                    <Typography
                      variant="body2"
                      sx={{ color: 'text.secondary', textTransform: 'capitalize', minWidth: 96 }}
                    >
                      {guardian.relationship}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
                      {guardian.contact_number || guardian.email}
                    </Typography>
                  </Stack>
                ))
              )}
            </Paper>
          </Box>
        </Stack>
      )}

      <ProfileEditDialog
        open={formOpen}
        profile={student}
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

export default StudentProfile;
