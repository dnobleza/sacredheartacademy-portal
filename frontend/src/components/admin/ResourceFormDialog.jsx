import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import GradientButton from '../common/GradientButton';
import ImageField from './ImageField';
import { getResource } from '../../services/adminApi';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildInitialValues = (fields, record) =>
  fields.reduce((values, field) => {
    const raw = record ? record[field.name] : '';

    // The API returns dates as ISO timestamps; the date input wants yyyy-mm-dd.
    if (field.type === 'date' && raw) {
      return { ...values, [field.name]: String(raw).slice(0, 10) };
    }

    // MySQL TIME serialises as HH:MM:SS, which a native time input rejects at
    // its default one-minute step — the field would open blank and silently
    // lose the stored value on save.
    if (field.type === 'time' && raw) {
      return { ...values, [field.name]: String(raw).slice(0, 5) };
    }

    return { ...values, [field.name]: raw ?? '' };
  }, {});

/**
 * Mirrors the backend validators closely enough to catch obvious mistakes
 * before a round trip. The server remains the authority.
 */
const validateValues = (fields, values) => {
  const errors = {};

  fields.forEach((field) => {
    const value = String(values[field.name] ?? '').trim();

    if (field.required && !value) {
      errors[field.name] = `${field.label} is required.`;
      return;
    }

    if (field.type === 'email' && value && !EMAIL_REGEX.test(value)) {
      errors[field.name] = 'Enter a valid email address.';
      return;
    }

    if (field.maxLength && value.length > field.maxLength) {
      errors[field.name] = `${field.label} must be ${field.maxLength} characters or fewer.`;
    }
  });

  return errors;
};

/**
 * A field either carries a fixed `options` array or names an `optionsSource`
 * the caller loaded from the API. Falling back to an empty list keeps the
 * select rendering while the request is still in flight.
 */
const optionsFor = (field, optionSources) =>
  field.options || optionSources[field.optionsSource] || [];

function ResourceFormDialog({
  open,
  resource,
  record,
  onClose,
  onSubmit,
  submitError,
  optionSources = {},
}) {
  const isEdit = Boolean(record);
  const fields = resource.fields.filter((field) => (isEdit ? true : !field.editOnly));

  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Read-only supplementary info (e.g. a class's enrolled students) that a
  // resource may want to show alongside the form fields. Only resources that
  // set `renderDetail` pay for the extra request, and only on edit — a new
  // record has no id to fetch detail for.
  const [detailRecord, setDetailRecord] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(buildInitialValues(fields, record));
      setErrors({});
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record]);

  useEffect(() => {
    if (!open || !record || !resource.renderDetail) {
      setDetailRecord(null);
      return;
    }

    let active = true;
    setDetailLoading(true);

    getResource(resource.key, record.id)
      .then((data) => {
        if (active) {
          setDetailRecord(data);
        }
      })
      .catch(() => {
        // Leaving detailRecord null falls back to the empty-state message.
      })
      .finally(() => {
        if (active) {
          setDetailLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, record, resource]);

  const handleChange = (name) => (event) => {
    setValues((current) => ({ ...current, [name]: event.target.value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const found = validateValues(fields, values);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      return;
    }

    // Send trimmed values; drop blanks so the backend keeps existing data
    // rather than overwriting a column with an empty string.
    const payload = fields.reduce((body, field) => {
      // An image id is sent even when empty: the server reads null as "clear
      // it", so dropping the blank would make removing a picture impossible.
      if (field.type === 'image') {
        return { ...body, [field.name]: values[field.name] ?? null };
      }

      const value = String(values[field.name] ?? '').trim();

      if (!value && !field.required) {
        return body;
      }

      return { ...body, [field.name]: value };
    }, {});

    setSubmitting(true);
    await onSubmit(payload);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isEdit ? `Edit ${resource.singular.toLowerCase()}` : `Add ${resource.singular.toLowerCase()}`}
      </DialogTitle>

      <form onSubmit={handleSubmit} noValidate>
        <DialogContent dividers>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {submitError}
            </Alert>
          )}

          {/* Only resources that create a login account get a temporary
              password; a school year has no user behind it. */}
          {!isEdit && resource.createsLoginAccount !== false && (
            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
              A temporary password is generated on save. It is shown once — copy it before closing.
            </Alert>
          )}

          <Grid container spacing={2.5}>
            {fields.map((field) => (
              <Grid key={field.name} size={{ xs: 12, sm: field.multiline ? 12 : 6 }}>
                {field.type === 'image' ? (
                  <ImageField
                    label={field.label}
                    value={values[field.name] ?? null}
                    onChange={(imageId) =>
                      setValues((current) => ({ ...current, [field.name]: imageId }))
                    }
                    disabled={submitting}
                  />
                ) : (
                <TextField
                  select={field.type === 'select'}
                  type={field.type === 'select' ? 'text' : field.type || 'text'}
                  label={field.label}
                  value={values[field.name] ?? ''}
                  onChange={handleChange(field.name)}
                  error={Boolean(errors[field.name])}
                  helperText={errors[field.name]}
                  required={field.required}
                  multiline={field.multiline}
                  minRows={field.multiline ? 2 : undefined}
                  disabled={submitting}
                  fullWidth
                  slotProps={
                    // A native date or time input paints its own placeholder, which
                    // the floating label would otherwise sit on top of.
                    field.type === 'date' || field.type === 'time'
                      ? { inputLabel: { shrink: true } }
                      : undefined
                  }
                >
                  {field.type === 'select' &&
                    optionsFor(field, optionSources).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                </TextField>
                )}
              </Grid>
            ))}
          </Grid>

          {isEdit && resource.renderDetail && resource.renderDetail(detailRecord, detailLoading)}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} disabled={submitting} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <GradientButton
            type="submit"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={17} color="inherit" /> : null}
          >
            {isEdit ? 'Save changes' : `Create ${resource.singular.toLowerCase()}`}
          </GradientButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default ResourceFormDialog;
