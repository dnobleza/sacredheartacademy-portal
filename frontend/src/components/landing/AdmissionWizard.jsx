import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CheckCircle2 } from 'lucide-react';
import GradientButton from '../common/GradientButton';
import DocumentField from './DocumentField';
import {
  fetchAdmissionAcademicYears,
  fetchAdmissionGradeLevels,
  submitAdmissionApplication,
} from '../../services/publicApi';
import { extractErrorMessage } from '../../services/api';
import { CARD_RADIUS } from '../../theme';

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const ENROLLMENT_TYPES = [
  {
    value: 'new',
    label: 'New Student',
    hint: 'Enrolling at Sacred Heart Academy for the first time.',
  },
  {
    value: 'returning',
    label: 'Returning Student',
    hint: 'Previously studied here and is coming back.',
  },
  {
    value: 'transferee',
    label: 'Transferee',
    hint: 'Moving here from another school.',
  },
];

// Mirrors REQUIREMENTS_BY_TYPE in backend/src/validations/admission-validation.js.
// Advisory only — nothing here blocks a submission.
export const REQUIREMENTS_BY_TYPE = {
  new: ['psa_birth_certificate', 'id_picture'],
  returning: ['id_picture'],
  transferee: ['form_137', 'good_moral', 'psa_birth_certificate', 'id_picture'],
};

export const DOCUMENT_FIELDS = [
  { name: 'good_moral', label: 'Good Moral Certificate', hint: 'From the previous school' },
  { name: 'form_137', label: 'Form 137', hint: 'Permanent academic record' },
  { name: 'psa_birth_certificate', label: 'PSA Birth Certificate', hint: 'PSA-issued copy' },
  { name: 'id_picture', label: '2x2 ID Picture', hint: 'Recent photo, white background' },
];

const EMPTY_FORM = {
  academic_year_id: '',
  enrollment_type: '',
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

const EMPTY_DOCUMENTS = {
  good_moral: null,
  form_137: null,
  psa_birth_certificate: null,
  id_picture: null,
};

// Which step owns which required field, so an error surfaces where it can be fixed.
const REQUIRED_BY_STEP = [
  {
    academic_year_id: 'Choose a school year.',
    enrollment_type: 'Choose an enrollment type.',
  },
  {
    first_name: 'First name is required.',
    last_name: 'Last name is required.',
    email: 'Email is required.',
    grade_level_id: 'Please choose a grade level.',
  },
  {
    guardian_name: 'Parent or guardian name is required.',
    guardian_contact_number: 'Parent or guardian contact number is required.',
  },
  {},
  {},
];

const STEP_LABELS = ['School Year', 'Student', 'Guardian', 'Requirements', 'Review'];

// Kept loose on purpose. The server is the authority on what is valid; this
// only catches the obvious mistakes before a round trip.
const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const looksLikePhone = (value) => /^(?:\+63|0)9\d{9}$/.test(value.replace(/[\s()-]/g, ''));

const DRAFT_KEY = 'admission.draft';

// Only the text answers survive a refresh: a File cannot be serialised, and
// the Requirements step says so rather than pretending the picks are kept.
const readDraft = () => {
  try {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    return stored ? { ...EMPTY_FORM, ...JSON.parse(stored) } : EMPTY_FORM;
  } catch {
    return EMPTY_FORM;
  }
};

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

function SummaryRow({ label, value }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 190 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}

/**
 * The public application, as a guided flow: school year and enrollment type,
 * then the student, then the guardian, then requirements, then a review before
 * anything is sent. Each step validates only the fields it owns.
 *
 * `onStateChange` reports { submitting, submitted } upward: the dialog uses it
 * to refuse a stray backdrop click while a submission is in flight or while the
 * reference number is on screen, which is the one unrecoverable mistake here.
 */
function AdmissionWizard({ onStateChange }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(readDraft);
  const [documents, setDocuments] = useState(EMPTY_DOCUMENTS);
  const [errors, setErrors] = useState({});
  const [academicYears, setAcademicYears] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetchAdmissionAcademicYears(), fetchAdmissionGradeLevels()])
      .then(([years, levels]) => {
        if (!cancelled) {
          setAcademicYears(years);
          setGradeLevels(levels);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSubmitError('Could not load the form options. Please refresh and try again.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    onStateChange?.({ submitting, submitted: Boolean(reference) });
  }, [submitting, reference, onStateChange]);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    } catch {
      // A refusal to persist a draft is not worth interrupting the applicant.
    }
  }, [form]);

  const requiredDocuments = useMemo(
    () => REQUIREMENTS_BY_TYPE[form.enrollment_type] || [],
    [form.enrollment_type],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const handleDocumentChange = (name, file, message) => {
    setDocuments((current) => ({ ...current, [name]: file }));
    setErrors((current) => ({ ...current, [name]: message }));
  };

  const validateStep = (index) => {
    const found = {};

    Object.entries(REQUIRED_BY_STEP[index] || {}).forEach(([name, message]) => {
      if (!String(form[name]).trim()) {
        found[name] = message;
      }
    });

    if (index === 1) {
      if (form.email.trim() && !looksLikeEmail(form.email)) {
        found.email = 'Enter a valid email address.';
      }

      if (form.contact_number.trim() && !looksLikePhone(form.contact_number)) {
        found.contact_number = 'Use a number like 09171234567.';
      }

      if (form.birth_date && new Date(form.birth_date) > new Date()) {
        found.birth_date = 'Birth date cannot be in the future.';
      }
    }

    if (index === 2) {
      if (form.guardian_contact_number.trim() && !looksLikePhone(form.guardian_contact_number)) {
        found.guardian_contact_number = 'Use a number like 09171234567.';
      }

      if (form.guardian_email.trim() && !looksLikeEmail(form.guardian_email)) {
        found.guardian_email = 'Enter a valid email address.';
      }
    }

    setErrors((current) => ({ ...current, ...found }));
    return Object.keys(found).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) {
      setStep((current) => current + 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitError('');

    // Re-check every step, not just the last: a field can be emptied after
    // its own step was passed.
    const firstInvalid = REQUIRED_BY_STEP.findIndex((_, index) => !validateStep(index));

    if (firstInvalid !== -1) {
      setStep(firstInvalid);
      return;
    }

    if (submitting) {
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
      const result = await submitAdmissionApplication(payload, documents);
      setReference(result.reference_number);
      setForm(EMPTY_FORM);
      setDocuments(EMPTY_DOCUMENTS);

      try {
        window.localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Nothing to do — the draft is a convenience, not state we depend on.
      }
    } catch (error) {
      setSubmitError(
        extractErrorMessage(error, 'Could not submit your application. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fieldProps = { form, errors, onChange: handleChange };
  const selectedYear = academicYears.find((year) => year.id === Number(form.academic_year_id));
  const selectedGrade = gradeLevels.find((level) => level.id === Number(form.grade_level_id));
  const selectedType = ENROLLMENT_TYPES.find((type) => type.value === form.enrollment_type);

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
          Keep this reference number. You will need it to check your status or to send anything the
          registrar asks for.
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
          Our registrar reviews applications within three school days. Track it any time with your
          reference number and email address.
        </Typography>

        <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
          <Button
            component={RouterLink}
            to="/admissions/status"
            sx={{ color: 'primary.dark', fontWeight: 700 }}
          >
            Check my application
          </Button>
          <Button onClick={() => { setReference(''); setStep(0); }} sx={{ color: 'text.secondary', fontWeight: 700 }}>
            Submit another
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
        {STEP_LABELS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: CARD_RADIUS }}>
          {submitError}
        </Alert>
      )}

      {step === 0 && (
        <Box>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>School year</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Field name="academic_year_id" label="Applying for *" select {...fieldProps}>
                {academicYears.length === 0 ? (
                  <MenuItem value="" disabled>
                    Loading…
                  </MenuItem>
                ) : (
                  academicYears.map((year) => (
                    <MenuItem key={year.id} value={year.id}>
                      {year.name}
                      {year.status === 'upcoming' ? ' (upcoming)' : ''}
                    </MenuItem>
                  ))
                )}
              </Field>
            </Grid>
          </Grid>

          <Typography sx={{ fontWeight: 800, mt: 2, mb: 0.5 }}>Enrollment type</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            This decides which documents we will ask for.
          </Typography>

          <Grid container spacing={2}>
            {ENROLLMENT_TYPES.map((type) => {
              const active = form.enrollment_type === type.value;

              return (
                <Grid key={type.value} size={{ xs: 12, sm: 4 }}>
                  <Paper
                    elevation={0}
                    onClick={() =>
                      handleChange({ target: { name: 'enrollment_type', value: type.value } })
                    }
                    sx={{
                      cursor: 'pointer',
                      height: '100%',
                      borderRadius: CARD_RADIUS,
                      p: 2,
                      border: '2px solid',
                      borderColor: active ? 'primary.main' : 'rgba(22,59,56,0.12)',
                      backgroundColor: active ? 'primary.light' : '#FFFFFF',
                      transition: 'border-color 180ms ease, background-color 180ms ease',
                    }}
                  >
                    <Typography sx={{ fontWeight: 700 }}>{type.label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {type.hint}
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>

          {errors.enrollment_type && (
            <Typography variant="caption" sx={{ color: 'error.main', display: 'block', mt: 1 }}>
              {errors.enrollment_type}
            </Typography>
          )}
        </Box>
      )}

      {step === 1 && (
        <Box>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Student information</Typography>
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
        </Box>
      )}

      {step === 2 && (
        <Box>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Parent or guardian</Typography>
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
        </Box>
      )}

      {step === 3 && (
        <Box>
          <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Requirements</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            {selectedType ? `For a ${selectedType.label.toLowerCase()}, ` : ''}the items marked
            Required are the ones the registrar will look for. Nothing here blocks your application —
            send what you have and the registrar will ask for the rest. PDF or photo, up to 5MB each.
          </Typography>

          <Grid container spacing={2}>
            {DOCUMENT_FIELDS.map((document) => (
              <Grid key={document.name} size={{ xs: 12, sm: 6 }}>
                <DocumentField
                  name={document.name}
                  label={document.label}
                  hint={
                    requiredDocuments.includes(document.name)
                      ? `Required · ${document.hint}`
                      : `Optional · ${document.hint}`
                  }
                  value={documents[document.name]}
                  error={errors[document.name]}
                  onChange={handleDocumentChange}
                />
              </Grid>
            ))}
          </Grid>

          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2 }}>
            Files are only attached when you submit — if you reload this page you will need to pick
            them again.
          </Typography>
        </Box>
      )}

      {step === 4 && (
        <Box>
          <Typography sx={{ fontWeight: 800, mb: 2 }}>Review your application</Typography>

          <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: '1px solid rgba(22,59,56,0.12)', p: 2.5, mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Enrollment</Typography>
              <Button size="small" onClick={() => setStep(0)} sx={{ fontWeight: 700 }}>
                Edit
              </Button>
            </Stack>
            <SummaryRow label="School year" value={selectedYear?.name} />
            <SummaryRow label="Enrollment type" value={selectedType?.label} />
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: '1px solid rgba(22,59,56,0.12)', p: 2.5, mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Student</Typography>
              <Button size="small" onClick={() => setStep(1)} sx={{ fontWeight: 700 }}>
                Edit
              </Button>
            </Stack>
            <SummaryRow
              label="Name"
              value={[form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ')}
            />
            <SummaryRow label="Grade level" value={selectedGrade?.name} />
            <SummaryRow label="Birth date" value={form.birth_date} />
            <SummaryRow label="Email" value={form.email} />
            <SummaryRow label="Mobile" value={form.contact_number} />
            <SummaryRow label="Address" value={form.address} />
            <SummaryRow label="Previous school" value={form.previous_school} />
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: '1px solid rgba(22,59,56,0.12)', p: 2.5, mb: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>Parent or guardian</Typography>
              <Button size="small" onClick={() => setStep(2)} sx={{ fontWeight: 700 }}>
                Edit
              </Button>
            </Stack>
            <SummaryRow label="Name" value={form.guardian_name} />
            <SummaryRow label="Relationship" value={form.guardian_relationship} />
            <SummaryRow label="Mobile" value={form.guardian_contact_number} />
            <SummaryRow label="Email" value={form.guardian_email} />
          </Paper>

          <Paper elevation={0} sx={{ borderRadius: CARD_RADIUS, border: '1px solid rgba(22,59,56,0.12)', p: 2.5 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography sx={{ fontWeight: 700 }}>Requirements</Typography>
              <Button size="small" onClick={() => setStep(3)} sx={{ fontWeight: 700 }}>
                Edit
              </Button>
            </Stack>

            <Stack spacing={1}>
              {DOCUMENT_FIELDS.map((document) => (
                <Stack key={document.name} direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" sx={{ minWidth: 190, color: 'text.secondary' }}>
                    {document.label}
                  </Typography>
                  {documents[document.name] ? (
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {documents[document.name].name}
                    </Typography>
                  ) : (
                    <Chip
                      size="small"
                      label={
                        requiredDocuments.includes(document.name) ? 'Not attached' : 'Not needed'
                      }
                      color={requiredDocuments.includes(document.name) ? 'warning' : 'default'}
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Box>
      )}

      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 3 }}>
        {step > 0 && (
          <Button
            onClick={() => setStep((current) => current - 1)}
            disabled={submitting}
            sx={{ fontWeight: 700 }}
          >
            Back
          </Button>
        )}

        <Box sx={{ ml: 'auto' }} />

        {step < STEP_LABELS.length - 1 ? (
          <GradientButton onClick={goNext} fullWidth={false}>
            Continue
          </GradientButton>
        ) : (
          <GradientButton onClick={handleSubmit} disabled={submitting} fullWidth={false}>
            {submitting ? 'Submitting…' : 'Submit application'}
          </GradientButton>
        )}

        {submitting && <CircularProgress size={22} aria-label="Submitting" />}
      </Stack>
    </Box>
  );
}

export default AdmissionWizard;
