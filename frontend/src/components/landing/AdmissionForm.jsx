import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CheckCircle2 } from 'lucide-react';
import GradientButton from '../common/GradientButton';
import { fetchAdmissionGradeLevels, submitAdmissionApplication } from '../../services/publicApi';
import { extractErrorMessage } from '../../services/api';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const EMPTY_FORM = {
  first_name: '',
  middle_name: '',
  last_name: '',
  birth_date: '',
  gender: '',
  address: '',
  email: '',
  contact_number: '',
  grade_level_id: '',
  previous_school: '',
  guardian_name: '',
  guardian_relationship: '',
  guardian_contact_number: '',
  guardian_email: '',
  notes: '',
};

const REQUIRED_FIELDS = {
  first_name: 'First name is required.',
  last_name: 'Last name is required.',
  email: 'Email is required.',
  grade_level_id: 'Please choose a grade level.',
  guardian_name: 'Parent or guardian name is required.',
  guardian_contact_number: 'Parent or guardian contact number is required.',
};

// Kept loose on purpose. The server is the authority on what is valid; this
// only catches the obvious mistakes before a round trip.
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const looksLikePhone = (value) => /^(?:\+63|0)9\d{9}$/.test(value.replace(/[\s()-]/g, ''));

function Field({ name, label, form, errors, onChange, ...props }) {
  return (
    <TextField
      name={name}
      label={label}
      value={form[name]}
      onChange={onChange}
      error={Boolean(errors[name])}
      helperText={errors[name] || props.helperText || ' '}
      fullWidth
      size="small"
      {...props}
    />
  );
}

/**
 * The public application form, shared by the /admissions page and the navbar's
 * dropdown dialog so both entry points submit exactly the same payload.
 *
 * `onStateChange` reports { submitting, submitted } upward: the dialog uses it
 * to refuse a stray backdrop click while a submission is in flight or while the
 * reference number is on screen, which is the one unrecoverable mistake here.
 */
function AdmissionForm({ onStateChange }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [gradeLevels, setGradeLevels] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    let cancelled = false;

    fetchAdmissionGradeLevels()
      .then((data) => {
        if (!cancelled) {
          setGradeLevels(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubmitError('Could not load the grade levels. Please refresh and try again.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onStateChange?.({ submitting, submitted: Boolean(reference) });
  }, [submitting, reference, onStateChange]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const validate = () => {
    const found = {};

    Object.entries(REQUIRED_FIELDS).forEach(([name, message]) => {
      if (!String(form[name]).trim()) {
        found[name] = message;
      }
    });

    if (form.email.trim() && !looksLikeEmail(form.email)) {
      found.email = 'Enter a valid email address.';
    }

    if (form.guardian_email.trim() && !looksLikeEmail(form.guardian_email)) {
      found.guardian_email = 'Enter a valid email address.';
    }

    if (form.contact_number.trim() && !looksLikePhone(form.contact_number)) {
      found.contact_number = 'Use a mobile number such as 09171234567.';
    }

    if (form.guardian_contact_number.trim() && !looksLikePhone(form.guardian_contact_number)) {
      found.guardian_contact_number = 'Use a mobile number such as 09171234567.';
    }

    if (form.birth_date && new Date(form.birth_date).getTime() > Date.now()) {
      found.birth_date = 'Birth date cannot be in the future.';
    }

    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate() || submitting) {
      return;
    }

    setSubmitting(true);

    // Blank optional fields are dropped rather than sent as '', so the server
    // stores NULL instead of empty strings.
    const payload = Object.fromEntries(
      Object.entries(form)
        .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
        .filter(([, value]) => value !== ''),
    );

    try {
      const result = await submitAdmissionApplication(payload);
      setReference(result.reference_number);
      setForm(EMPTY_FORM);
    } catch (error) {
      setSubmitError(
        extractErrorMessage(error, 'Could not submit your application. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = { form, errors, onChange: handleChange };

  if (reference) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }}>
        <Box aria-hidden="true" sx={{ color: 'primary.dark', display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CheckCircle2 size={44} />
        </Box>

        <Typography variant="h3" component="p" sx={{ fontSize: '1.5rem' }}>
          Application received
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.5 }}>
          Keep this reference number. You will need it when you follow up with the registrar.
        </Typography>

        <Typography
          sx={{
            mt: 3,
            mb: 3,
            fontWeight: 800,
            fontSize: '1.75rem',
            letterSpacing: '0.08em',
            color: 'primary.dark',
          }}
        >
          {reference}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Our registrar reviews applications within three school days and will contact you by email
          or phone.
        </Typography>

        <Button onClick={() => setReference('')} sx={{ mt: 2, color: 'primary.dark', fontWeight: 700 }}>
          Submit another application
        </Button>
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}

      <Typography sx={{ fontWeight: 800, mb: 2 }}>Applicant</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Field name="first_name" label="First name *" {...fieldProps} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Field name="middle_name" label="Middle name" {...fieldProps} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Field name="last_name" label="Last name *" {...fieldProps} />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <Field
            name="birth_date"
            label="Birth date"
            type="date"
            slotProps={{ inputLabel: { shrink: true } }}
            {...fieldProps}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Field name="gender" label="Gender" select {...fieldProps}>
            <MenuItem value="">Prefer not to say</MenuItem>
            {GENDER_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Field>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <Field name="grade_level_id" label="Grade level applying for *" select {...fieldProps}>
            {gradeLevels.length === 0 ? (
              <MenuItem value="" disabled>
                Loading…
              </MenuItem>
            ) : (
              gradeLevels.map((level) => (
                <MenuItem key={level.id} value={level.id}>
                  {level.name}
                </MenuItem>
              ))
            )}
          </Field>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Field name="email" label="Email *" type="email" {...fieldProps} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field
            name="contact_number"
            label="Mobile number"
            helperText="For example 09171234567"
            {...fieldProps}
          />
        </Grid>

        <Grid size={12}>
          <Field name="address" label="Home address" multiline minRows={2} {...fieldProps} />
        </Grid>
        <Grid size={12}>
          <Field name="previous_school" label="Previous school" {...fieldProps} />
        </Grid>
      </Grid>

      <Typography sx={{ fontWeight: 800, mt: 3, mb: 2 }}>Parent or guardian</Typography>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field name="guardian_name" label="Full name *" {...fieldProps} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field
            name="guardian_relationship"
            label="Relationship to the applicant"
            helperText="For example Mother, Father, Guardian"
            {...fieldProps}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field
            name="guardian_contact_number"
            label="Mobile number *"
            helperText="For example 09171234567"
            {...fieldProps}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Field name="guardian_email" label="Email" type="email" {...fieldProps} />
        </Grid>
        <Grid size={12}>
          <Field name="notes" label="Anything else we should know" multiline minRows={3} {...fieldProps} />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
        <GradientButton type="submit" disabled={submitting} fullWidth={false}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </GradientButton>

        {submitting && <CircularProgress size={22} aria-label="Submitting" />}
      </Stack>
    </Box>
  );
}

export default AdmissionForm;
