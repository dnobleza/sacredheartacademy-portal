import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Check, Copy } from 'lucide-react';
import GradientButton from '../common/GradientButton';

/**
 * The backend generates a temporary password on create and returns it exactly
 * once — it is hashed on the way in and can never be read back. Shown here so
 * the admin can pass it to the account holder before closing.
 */
function TemporaryPasswordDialog({ open, account, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(account.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the value is on screen to copy by hand.
    }
  };

  if (!account) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Account created</DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 2 }}>
          This password is shown once and cannot be retrieved again. Copy it now.
        </Alert>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
          Email
        </Typography>
        <Typography sx={{ fontWeight: 600, mb: 2.5, overflowWrap: 'anywhere' }}>
          {account.email}
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 0.5 }}>
          Temporary password
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box
            sx={{
              flexGrow: 1,
              fontFamily: 'monospace',
              fontSize: '1rem',
              backgroundColor: 'primary.light',
              color: 'primary.dark',
              borderRadius: 2,
              px: 2,
              py: 1.25,
              overflowWrap: 'anywhere',
            }}
          >
            {account.temporary_password}
          </Box>
          <Tooltip title={copied ? 'Copied' : 'Copy password'}>
            <IconButton onClick={handleCopy} aria-label="Copy temporary password">
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </IconButton>
          </Tooltip>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <GradientButton onClick={onClose}>Done</GradientButton>
      </DialogActions>
    </Dialog>
  );
}

export default TemporaryPasswordDialog;
