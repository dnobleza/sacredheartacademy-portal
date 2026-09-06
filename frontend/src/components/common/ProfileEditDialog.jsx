import { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ImageField from '../admin/ImageField';
import { CARD_RADIUS } from '../../theme';

/**
 * Self-service profile editing, shared by every portal. It offers exactly the
 * three fields the server accepts — photo, contact number, address. Names,
 * birth date, gender, student and employee numbers, email and account status
 * are registrar records, so they are shown on the page but never here.
 *
 * The photo reuses ImageField, which uploads the file as soon as it is picked
 * and hands back the images row id that photo_id expects.
 */
function ProfileEditDialog({ open, profile, onClose, onSubmit, submitError }) {
  const [values, setValues] = useState({ contact_number: '', address: '', photo_id: null });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({
        contact_number: profile?.contact_number || '',
        address: profile?.address || '',
        photo_id: profile?.photo_id ?? null,
      });
      setError('');
    }
  }, [open, profile]);

  const setField = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }));

  const handleSubmit = async () => {
    const contact = values.contact_number.trim();

    // Mirrors the server rule so a typo is caught before the round trip; the
    // server checks it again regardless.
    if (contact && !/^(?:\+63|0)9\d{9}$/.test(contact.replace(/[\s-]/g, ''))) {
      setError('Enter a valid mobile number, for example 09171234567.');
      return;
    }

    setError('');
    setSaving(true);

    try {
      await onSubmit({
        contact_number: contact,
        address: values.address.trim(),
        photo_id: values.photo_id,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={saving ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: CARD_RADIUS } } }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>Edit profile</DialogTitle>

      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {(error || submitError) && (
            <Alert severity="error" sx={{ borderRadius: CARD_RADIUS }}>
              {error || submitError}
            </Alert>
          )}

          <ImageField
            label="Photo"
            value={values.photo_id}
            disabled={saving}
            onChange={(imageId) => setValues((current) => ({ ...current, photo_id: imageId }))}
          />

          <TextField
            label="Mobile number"
            value={values.contact_number}
            onChange={setField('contact_number')}
            disabled={saving}
            fullWidth
            placeholder="09171234567"
          />

          <TextField
            label="Address"
            value={values.address}
            onChange={setField('address')}
            disabled={saving}
            fullWidth
            multiline
            minRows={2}
          />

          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Your name, email and account details are managed by the school administrator.
          </Typography>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving}
          variant="contained"
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ProfileEditDialog;
