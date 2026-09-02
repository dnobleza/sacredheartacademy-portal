import { useState } from 'react';
import { Link as RouterLink, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import Logo from '../components/common/Logo';
import GradientButton from '../components/common/GradientButton';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../services/api';
import { roleHome } from '../utils/roles';
import { glass, AQUA } from '../theme';
import { school } from '../data/landing';

// Mirrors backend/src/validations/auth-validation.js. The server validates
// regardless — this only saves a round trip.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = ({ email, password }) => {
  const errors = {};

  if (!email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!password) {
    errors.password = 'Password is required.';
  }

  return errors;
};

function Login() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in — skip the form entirely.
  if (status === 'authenticated') {
    return <Navigate to={location.state?.from?.pathname || roleHome(user.role)} replace />;
  }

  const handleChange = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));

    if (fieldErrors[field]) {
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = validate(values);
    setFieldErrors(errors);
    setFormError('');

    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);

    try {
      const signedIn = await login(values.email.trim(), values.password);
      const destination = location.state?.from?.pathname || roleHome(signedIn.role);
      navigate(destination, { replace: true });
    } catch (error) {
      // The server answers wrong-email and wrong-password identically on
      // purpose — pass its message straight through, never guess which failed.
      setFormError(extractErrorMessage(error, 'Unable to sign in. Please try again.'));
      setValues((current) => ({ ...current, password: '' }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      component="main"
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: `linear-gradient(180deg, ${AQUA.light} 0%, #FFFFFF 60%)`,
        px: 2,
        py: 6,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Box sx={{ ...glass, p: { xs: 3.5, md: 4.5 } }}>
          <Stack alignItems="center" sx={{ mb: 3.5, textAlign: 'center' }}>
            <Logo size={64} sx={{ mb: 2 }} />

            <Typography variant="h2" component="h1" sx={{ fontSize: '1.5rem' }}>
              Sign in to your portal
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              {school.name}
            </Typography>
          </Stack>

          {formError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              {formError}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack spacing={2.5}>
              <TextField
                label="Email"
                type="email"
                value={values.email}
                onChange={handleChange('email')}
                error={Boolean(fieldErrors.email)}
                helperText={fieldErrors.email}
                autoComplete="email"
                autoFocus
                fullWidth
                disabled={submitting}
              />

              <TextField
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                onChange={handleChange('password')}
                error={Boolean(fieldErrors.password)}
                helperText={fieldErrors.password}
                autoComplete="current-password"
                fullWidth
                disabled={submitting}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((shown) => !shown)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <GradientButton
                type="submit"
                fullWidth
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
                sx={{ mt: 0.5, py: 1.3 }}
              >
                {submitting ? 'Signing in…' : 'Sign In'}
              </GradientButton>
            </Stack>
          </Box>

          <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowLeft size={17} />}
            fullWidth
            sx={{ mt: 2.5, color: 'primary.dark', '&:hover': { background: 'transparent' } }}
          >
            Back to home
          </Button>
        </Box>

        <Typography
          variant="caption"
          sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 3 }}
        >
          Students, parents, teachers, and staff all sign in here.
        </Typography>
      </Container>
    </Box>
  );
}

export default Login;
