import { useCallback, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { X } from 'lucide-react';
import AdmissionForm from './AdmissionForm';

/**
 * The application form as a dialog, opened from the navbar's Admissions
 * dropdown so a visitor can apply without leaving the page they are reading.
 */
function AdmissionFormDialog({ open, onClose }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const [state, setState] = useState({ submitting: false, submitted: false });

  // Stable, so the form's reporting effect does not re-run on every render.
  const handleStateChange = useCallback((next) => setState(next), []);

  // A stray backdrop click or Escape must not discard an in-flight submission,
  // nor the reference number the applicant still has to write down. The close
  // button stays available in both cases.
  const handleClose = (event, reason) => {
    if (state.submitting) {
      return;
    }

    if (state.submitted && (reason === 'backdropClick' || reason === 'escapeKeyDown')) {
      return;
    }

    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={fullScreen}
      aria-labelledby="admission-form-dialog-title"
    >
      <DialogTitle id="admission-form-dialog-title" sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <div>
            <Typography sx={{ fontWeight: 800, fontSize: '1.25rem' }}>Application form</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Fields marked with an asterisk are required. There is no fee to apply.
            </Typography>
          </div>

          <IconButton onClick={onClose} aria-label="Close" disabled={state.submitting} sx={{ mt: -0.5 }}>
            <X size={19} />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <AdmissionForm onStateChange={handleStateChange} />
      </DialogContent>
    </Dialog>
  );
}

export default AdmissionFormDialog;
